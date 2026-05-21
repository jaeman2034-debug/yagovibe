/**
 * 🔥 자동 리포트 생성 (월간/대회 종료)
 * 
 * 월간 또는 대회 종료 시 운영 리포트를 자동으로 생성합니다.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";

/**
 * 월간 리포트 생성 스케줄러
 * 매월 1일 자정에 실행
 */
export const monthlyTournamentReportJob = onSchedule(
  {
    schedule: "0 0 1 * *", // 매월 1일 00:00
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    try {
      // 모든 associations 조회
      const associationsRef = db.collection("associations");
      const associationsSnap = await associationsRef.get();

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth()).padStart(2, "0");
      const period = `${year}-${month}`;

      console.log(`[monthlyTournamentReportJob] 월간 리포트 생성 시작`, {
        period,
        associationCount: associationsSnap.size,
      });

      for (const associationDoc of associationsSnap.docs) {
        const associationId = associationDoc.id;
        const association = associationDoc.data();

        // Pro 플랜만 리포트 생성
        if (association.plan !== "pro") {
          console.log(`[monthlyTournamentReportJob] association ${associationId} free 플랜 - 스킵`);
          continue;
        }

        try {
          await generateReportForAssociation(db, associationId, "monthly", period);
        } catch (error: any) {
          console.error(`[monthlyTournamentReportJob] association ${associationId} 리포트 생성 실패:`, error);
          // 하나 실패해도 다른 association은 계속 처리
        }
      }

      console.log(`[monthlyTournamentReportJob] 월간 리포트 생성 완료`);
    } catch (error: any) {
      console.error(`[monthlyTournamentReportJob] 에러 발생:`, error);
    }
  }
);

/**
 * 대회 종료 시 리포트 생성 (트리거)
 */
export const generateTournamentReportOnComplete = onDocumentWritten(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/tournaments/{tournamentId}",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const associationId = event.params.associationId as string;
    const tournamentId = event.params.tournamentId as string;

    try {
      const beforeData = event.data?.before?.data();
      const afterData = event.data?.after?.data();

      // status가 "completed"로 변경되었는지 확인
      if (!afterData || afterData.status !== "completed" || beforeData?.status === "completed") {
        return;
      }

      // Association 플랜 확인
      const associationRef = db.doc(`associations/${associationId}`);
      const associationSnap = await associationRef.get();

      if (!associationSnap.exists) {
        return;
      }

      const association = associationSnap.data();
      if (association?.plan !== "pro") {
        console.log(`[generateTournamentReport] association ${associationId} free 플랜 - 리포트 생성 스킵`);
        return;
      }

      await generateReportForAssociation(db, associationId, "tournament", tournamentId);
    } catch (error: any) {
      console.error(`[generateTournamentReport] 에러 발생:`, {
        associationId,
        tournamentId,
        error: error.message,
      });
    }
  }
);

/**
 * 리포트 생성 (공통 로직)
 */
async function generateReportForAssociation(
  db: admin.firestore.Firestore,
  associationId: string,
  type: "monthly" | "tournament",
  periodOrTournamentId: string
) {
  const tournamentsRef = db.collection(`associations/${associationId}/tournaments`);

  let tournaments: any[] = [];
  let summary: {
    tournaments: number;
    matches: number;
    champions: string[];
  };

  if (type === "monthly") {
    // 월간 리포트: 해당 월의 대회들
    const [year, month] = periodOrTournamentId.split("-");
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // completedAt이 있는 대회만 조회 (복합 쿼리 대신 전체 조회 후 필터링)
    const allTournamentsSnap = await tournamentsRef.get();
    const filteredTournaments = allTournamentsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((t) => {
        if (!t.completedAt) return false;
        const completedDate = t.completedAt.toDate();
        return completedDate >= startDate && completedDate <= endDate;
      });

    summary = {
      tournaments: filteredTournaments.length,
      matches: 0,
      champions: filteredTournaments
        .filter((t) => t.champion?.teamId)
        .map((t) => t.champion.teamId),
    };

    // matches 수 집계
    for (const tournament of filteredTournaments) {
      const matchesRef = tournamentsRef.doc(tournament.id).collection("matches");
      const playoffMatchesRef = tournamentsRef.doc(tournament.id).collection("playoff").collection("matches");
      const [matchesSnap, playoffMatchesSnap] = await Promise.all([
        matchesRef.get(),
        playoffMatchesRef.get(),
      ]);
      summary.matches += matchesSnap.size + playoffMatchesSnap.size;
    }

  } else {
    // 대회 종료 리포트: 특정 대회
    const tournamentRef = tournamentsRef.doc(periodOrTournamentId);
    const tournamentSnap = await tournamentRef.get();

    if (!tournamentSnap.exists) {
      return;
    }

    const tournament = { id: tournamentSnap.id, ...tournamentSnap.data() };

    const matchesRef = tournamentRef.collection("matches");
    const playoffMatchesRef = tournamentRef.collection("playoff").collection("matches");
    const [matchesSnap, playoffMatchesSnap] = await Promise.all([
      matchesRef.get(),
      playoffMatchesRef.get(),
    ]);

    summary = {
      tournaments: 1,
      matches: matchesSnap.size + playoffMatchesSnap.size,
      champions: tournament.champion?.teamId ? [tournament.champion.teamId] : [],
    };
  }

  // 리포트 문서 생성
  const reportsRef = db.collection(`associations/${associationId}/reports`);
  const reportRef = reportsRef.doc();

  await reportRef.set({
    type,
    period: type === "monthly" ? periodOrTournamentId : undefined,
    tournamentId: type === "tournament" ? periodOrTournamentId : undefined,
    summary,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 로그 기록
  const logsRef = db.collection(`associations/${associationId}/logs`).doc();
  await logsRef.set({
    type: "report_generate",
    message: "운영 리포트 생성 완료",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    by: "system",
    payload: {
      reportId: reportRef.id,
      reportType: type,
    },
  });

  console.log(`[generateReportForAssociation] 리포트 생성 완료`, {
    associationId,
    reportId: reportRef.id,
    type,
    summary,
  });
}

