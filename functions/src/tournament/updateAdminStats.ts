/**
 * 🔥 관리자 대시보드 데이터 집계
 * 
 * tournament/team/match 변경 시 adminStats를 자동으로 업데이트합니다.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";

/**
 * Tournament 생성/종료 시 adminStats 업데이트
 */
export const updateAdminStatsOnTournament = onDocumentWritten(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/tournaments/{tournamentId}",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const associationId = event.params.associationId as string;

    try {
      await recomputeAdminStats(db, associationId);
    } catch (error: any) {
      console.error(`[updateAdminStats] 에러 발생:`, {
        associationId,
        error: error.message,
      });
    }
  }
);

/**
 * Team 추가 시 adminStats 업데이트
 */
export const updateAdminStatsOnTeam = onDocumentWritten(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/teams/{teamId}",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const associationId = event.params.associationId as string;

    try {
      await recomputeAdminStats(db, associationId);
    } catch (error: any) {
      console.error(`[updateAdminStats] 에러 발생:`, {
        associationId,
        error: error.message,
      });
    }
  }
);

/**
 * Match 생성 시 adminStats 업데이트
 */
export const updateAdminStatsOnMatch = onDocumentWritten(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const associationId = event.params.associationId as string;

    try {
      await recomputeAdminStats(db, associationId);
    } catch (error: any) {
      console.error(`[updateAdminStats] 에러 발생:`, {
        associationId,
        error: error.message,
      });
    }
  }
);

/**
 * adminStats 재계산
 */
async function recomputeAdminStats(
  db: any,
  associationId: string
) {
  const adminModule = await import("../firebaseAdmin");
  const { admin } = adminModule;
  const tournamentsRef = db.collection(`associations/${associationId}/tournaments`);
  const teamsRef = db.collection(`associations/${associationId}/teams`);

  // 모든 tournaments 조회
  const tournamentsSnap = await tournamentsRef.get();
  let totalTournaments = 0;
  let activeTournaments = 0;
  let totalMatches = 0;

  // 각 tournament의 matches 수집
  for (const tournamentDoc of tournamentsSnap.docs) {
    const tournament = tournamentDoc.data();
    totalTournaments++;

    if (tournament.status !== "completed") {
      activeTournaments++;
    }

    // matches 수집
    const matchesRef = tournamentDoc.ref.collection("matches");
    const matchesSnap = await matchesRef.get();
    totalMatches += matchesSnap.size;

    // playoff matches도 포함
    const playoffMatchesRef = tournamentDoc.ref.collection("playoff").collection("matches");
    const playoffMatchesSnap = await playoffMatchesRef.get();
    totalMatches += playoffMatchesSnap.size;
  }

  // teams 수집
  const teamsSnap = await teamsRef.get();
  const totalTeams = teamsSnap.size;

  // adminStats 업데이트
  const adminStatsRef = db.doc(
    `associations/${associationId}/adminStats/overview`
  );

  await adminStatsRef.set({
    totalTournaments,
    activeTournaments,
    totalTeams,
    totalMatches,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`[updateAdminStats] 집계 완료`, {
    associationId,
    totalTournaments,
    activeTournaments,
    totalTeams,
    totalMatches,
  });
}

