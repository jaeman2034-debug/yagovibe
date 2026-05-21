/**
 * 🔥 연쇄 시스템 공지 자동 생성 트리거
 * 
 * 8가지 이벤트 자동 생성:
 * ① TOURNAMENT_CREATED - 대회 생성
 * ② APPLY_STARTED - 참가 신청 시작
 * ③ APPLY_CLOSED - 참가 신청 마감
 * ④ ROSTER_CLOSED - 선수 명단 수정 마감
 * ⑤ REVIEW_COMPLETED - 사무국 검수 완료
 * ⑥ DRAW_COMPLETED - 조 추첨 완료
 * ⑦ TOURNAMENT_STARTED - 대회 시작
 * ⑧ TOURNAMENT_ENDED - 대회 종료
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { createSystemNotice, SystemNoticeEvent, formatDate } from "./systemNoticeHelper";

/**
 * ① 대회 생성 시 시스템 공지 (기존 로직 활용)
 */
export async function triggerTournamentCreated(
  associationId: string,
  tournamentId: string,
  tournament: any
): Promise<string | null> {
  // 트리거 조건 체크
  if (tournament.adminStatus !== "published") {
    return null;
  }
  if (!tournament.isOfficial) {
    return null;
  }

  const tournamentName = tournament.title || tournament.name || "대회";
  const tournamentDateStart = tournament.dateStart || tournament.startDate;
  const tournamentDateEnd = tournament.dateEnd || tournament.endDate;

  return await createSystemNotice({
    associationId,
    tournamentId,
    tournament,
    event: "TOURNAMENT_CREATED",
    title: `[대회 생성] ${tournamentName}`,
    summary: `${tournamentName}가 공식 생성되었습니다.`,
    content: {
      tournamentId,
      tournamentName,
      tournamentPeriod: {
        start: tournamentDateStart?.toDate ? tournamentDateStart.toDate().toISOString().split("T")[0] : null,
        end: tournamentDateEnd?.toDate ? tournamentDateEnd.toDate().toISOString().split("T")[0] : null,
      },
      status: "CREATED",
    },
  });
}

/**
 * ② 참가 신청 시작 시 시스템 공지
 */
export async function triggerApplyStarted(
  associationId: string,
  tournamentId: string,
  tournament: any
): Promise<string | null> {
  if (!tournament.isOfficial) return null;
  if (!tournament.registrationPeriod?.startDate) return null;

  const startDate = tournament.registrationPeriod.startDate.toDate
    ? tournament.registrationPeriod.startDate.toDate()
    : new Date(tournament.registrationPeriod.startDate);
  const now = new Date();

  // 신청 시작일이 오늘이 아니면 생성 안 함 (스케줄러에서 처리)
  if (startDate.toDateString() !== now.toDateString()) {
    return null;
  }

  const tournamentName = tournament.title || tournament.name || "대회";

  return await createSystemNotice({
    associationId,
    tournamentId,
    tournament,
    event: "APPLY_STARTED",
    title: `[참가 신청 시작] ${tournamentName}`,
    summary: `${tournamentName} 참가 신청이 시작되었습니다.`,
    content: {
      tournamentId,
      tournamentName,
      status: "APPLY_OPEN",
      registrationPeriod: {
        start: startDate.toISOString().split("T")[0],
        end: tournament.registrationPeriod.endDate?.toDate
          ? tournament.registrationPeriod.endDate.toDate().toISOString().split("T")[0]
          : null,
      },
    },
    effectiveAt: startDate,
  });
}

/**
 * ③ 참가 신청 마감 시 시스템 공지
 */
export async function triggerApplyClosed(
  associationId: string,
  tournamentId: string,
  tournament: any
): Promise<string | null> {
  if (!tournament.isOfficial) return null;
  if (!tournament.registrationPeriod?.endDate) return null;

  const endDate = tournament.registrationPeriod.endDate.toDate
    ? tournament.registrationPeriod.endDate.toDate()
    : new Date(tournament.registrationPeriod.endDate);
  const now = new Date();

  // 신청 종료일이 오늘이 아니면 생성 안 함
  if (endDate.toDateString() !== now.toDateString()) {
    return null;
  }

  const tournamentName = tournament.title || tournament.name || "대회";

  return await createSystemNotice({
    associationId,
    tournamentId,
    tournament,
    event: "APPLY_CLOSED",
    title: `[참가 신청 마감] ${tournamentName}`,
    summary: `${tournamentName} 참가 신청이 마감되었습니다.`,
    content: {
      tournamentId,
      tournamentName,
      status: "APPLY_CLOSED",
    },
    effectiveAt: endDate,
  });
}

/**
 * ④ 선수 명단 수정 마감 시 시스템 공지
 */
export async function triggerRosterClosed(
  associationId: string,
  tournamentId: string,
  tournament: any
): Promise<string | null> {
  if (!tournament.isOfficial) return null;
  if (!tournament.rosterEditPeriod?.endDate) return null;

  const endDate = tournament.rosterEditPeriod.endDate.toDate
    ? tournament.rosterEditPeriod.endDate.toDate()
    : new Date(tournament.rosterEditPeriod.endDate);
  const now = new Date();

  if (endDate.toDateString() !== now.toDateString()) {
    return null;
  }

  const tournamentName = tournament.title || tournament.name || "대회";

  return await createSystemNotice({
    associationId,
    tournamentId,
    tournament,
    event: "ROSTER_CLOSED",
    title: `[선수 명단 수정 마감] ${tournamentName}`,
    summary: `${tournamentName} 선수 명단 수정이 마감되었습니다.`,
    content: {
      tournamentId,
      tournamentName,
      status: "ROSTER_CLOSED",
    },
    effectiveAt: endDate,
  });
}

/**
 * ⑤ 사무국 검수 완료 시 시스템 공지 (상태 변경 감지)
 */
export async function triggerReviewCompleted(
  associationId: string,
  tournamentId: string,
  tournament: any
): Promise<string | null> {
  if (!tournament.isOfficial) return null;

  // reviewPeriod 종료일 확인
  if (!tournament.reviewPeriod?.endDate) return null;

  const endDate = tournament.reviewPeriod.endDate.toDate
    ? tournament.reviewPeriod.endDate.toDate()
    : new Date(tournament.reviewPeriod.endDate);
  const now = new Date();

  // 검수 종료일이 지났는지 확인
  if (endDate > now) {
    return null;
  }

  const tournamentName = tournament.title || tournament.name || "대회";

  return await createSystemNotice({
    associationId,
    tournamentId,
    tournament,
    event: "REVIEW_COMPLETED",
    title: `[사무국 검수 완료] ${tournamentName}`,
    summary: `${tournamentName} 사무국 검수가 완료되었습니다.`,
    content: {
      tournamentId,
      tournamentName,
      status: "REVIEW_COMPLETED",
    },
    effectiveAt: endDate,
  });
}

/**
 * ⑥ 조 추첨 완료 시 시스템 공지 (drawExecuted 변경 감지)
 */
export async function triggerDrawCompleted(
  associationId: string,
  tournamentId: string,
  tournament: any,
  before?: any
): Promise<string | null> {
  if (!tournament.isOfficial) return null;

  // drawExecuted가 false → true로 변경되었는지 확인
  if (before && before.drawExecuted === tournament.drawExecuted) {
    return null;
  }

  if (!tournament.drawExecuted) {
    return null;
  }

  const tournamentName = tournament.title || tournament.name || "대회";
  const drawDate = tournament.drawExecutedAt?.toDate || new Date();

  return await createSystemNotice({
    associationId,
    tournamentId,
    tournament,
    event: "DRAW_COMPLETED",
    title: `[조 추첨 완료] ${tournamentName}`,
    summary: `${tournamentName} 조 추첨이 완료되었습니다.`,
    content: {
      tournamentId,
      tournamentName,
      status: "DRAW_COMPLETED",
      drawDate: drawDate instanceof Date ? drawDate.toISOString().split("T")[0] : formatDate(tournament.drawDate?.date),
    },
    effectiveAt: drawDate instanceof Date ? drawDate : new Date(),
  });
}

/**
 * ⑦ 대회 시작 시 시스템 공지
 */
export async function triggerTournamentStarted(
  associationId: string,
  tournamentId: string,
  tournament: any
): Promise<string | null> {
  if (!tournament.isOfficial) return null;
  if (!tournament.dateStart) return null;

  const startDate = tournament.dateStart.toDate
    ? tournament.dateStart.toDate()
    : new Date(tournament.dateStart);
  const now = new Date();

  // 대회 시작일이 오늘이 아니면 생성 안 함
  if (startDate.toDateString() !== now.toDateString()) {
    return null;
  }

  const tournamentName = tournament.title || tournament.name || "대회";

  return await createSystemNotice({
    associationId,
    tournamentId,
    tournament,
    event: "TOURNAMENT_STARTED",
    title: `[대회 시작] ${tournamentName}`,
    summary: `${tournamentName}가 시작되었습니다.`,
    content: {
      tournamentId,
      tournamentName,
      status: "ONGOING",
    },
    effectiveAt: startDate,
  });
}

/**
 * ⑧ 대회 종료 시 시스템 공지
 */
export async function triggerTournamentEnded(
  associationId: string,
  tournamentId: string,
  tournament: any
): Promise<string | null> {
  if (!tournament.isOfficial) return null;
  if (!tournament.dateEnd) return null;

  const endDate = tournament.dateEnd.toDate
    ? tournament.dateEnd.toDate()
    : new Date(tournament.dateEnd);
  const now = new Date();

  // 대회 종료일이 오늘이 아니면 생성 안 함
  if (endDate.toDateString() !== now.toDateString()) {
    return null;
  }

  const tournamentName = tournament.title || tournament.name || "대회";

  return await createSystemNotice({
    associationId,
    tournamentId,
    tournament,
    event: "TOURNAMENT_ENDED",
    title: `[대회 종료] ${tournamentName}`,
    summary: `${tournamentName}가 종료되었습니다.`,
    content: {
      tournamentId,
      tournamentName,
      status: "COMPLETED",
    },
    effectiveAt: endDate,
  });
}

/**
 * 매일 실행되는 스케줄러: 날짜 기반 이벤트 체크
 */
export const checkTournamentEvents = onSchedule(
  {
    schedule: "0 0 * * *", // 매일 자정 (KST)
    region: "asia-northeast3",
    timeZone: "Asia/Seoul",
  },
  async (event) => {
    logger.info("🔥 날짜 기반 시스템 공지 체크 시작");

    const db = getFirestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // 모든 협회 조회
      const associationsSnapshot = await db.collection("associations").get();

      for (const assocDoc of associationsSnapshot.docs) {
        const associationId = assocDoc.id;
        const tournamentsRef = db.collection(`associations/${associationId}/tournaments`);

        // published이고 isOfficial인 대회만 조회
        const tournamentsSnapshot = await tournamentsRef
          .where("adminStatus", "==", "published")
          .where("isOfficial", "==", true)
          .get();

        for (const tournamentDoc of tournamentsSnapshot.docs) {
          const tournamentId = tournamentDoc.id;
          const tournament = tournamentDoc.data();

          try {
            // 각 이벤트 체크 및 생성
            await triggerApplyStarted(associationId, tournamentId, tournament);
            await triggerApplyClosed(associationId, tournamentId, tournament);
            await triggerRosterClosed(associationId, tournamentId, tournament);
            await triggerTournamentStarted(associationId, tournamentId, tournament);
            await triggerTournamentEnded(associationId, tournamentId, tournament);
          } catch (error: any) {
            logger.error(`❌ 대회 ${tournamentId} 이벤트 체크 오류:`, {
              tournamentId,
              error: error.message,
            });
          }
        }
      }

      logger.info("✅ 날짜 기반 시스템 공지 체크 완료");
    } catch (error: any) {
      logger.error("❌ 날짜 기반 시스템 공지 체크 오류:", error);
    }
  }
);

