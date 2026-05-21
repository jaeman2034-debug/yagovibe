/**
 * 🔥 대회 대시보드 집계
 * Phase 1-4: 홈 화면 숫자용
 */

import type { Firestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

function dateKeyFromServer(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 대회 통계 재계산
 * 경로: associations/{associationId}/tournaments/{tournamentId}
 */
export async function recomputeDailyStatsForTournament(
  db: Firestore,
  associationId: string,
  tournamentId: string
) {
  // MVP: "오늘"만 집계
  const key = dateKeyFromServer();

  const matchesSnap = await db
    .collection(`associations/${associationId}/tournaments/${tournamentId}/matches`)
    .get();

  let todayMatchCount = 0;
  let unassignedRefMatchCount = 0;
  let uncheckedPlayerCount = 0;

  for (const doc of matchesSnap.docs) {
    const m = doc.data() as any;

    // date 필드 체크 (ISO string 형식: "2026-08-19")
    const matchDate = m.date;
    if (!matchDate || matchDate !== key) continue;

    todayMatchCount += 1;

    // 심판 미배정 체크
    const referees = m.referees || {};
    const hasMainReferee = !!referees.main;
    if (!hasMainReferee) {
      unassignedRefMatchCount += 1;
    }

    // 미검인 선수 수: roster 수 - checkin 수 (간단 버전)
    const matchId = doc.id;
    const [rostersSnap, checkinsSnap] = await Promise.all([
      db
        .collection(
          `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/rosters`
        )
        .get(),
      db
        .collection(
          `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/checkins`
        )
        .get(),
    ]);

    const rosterCount = rostersSnap.size;
    const checkinCount = checkinsSnap.size;

    uncheckedPlayerCount += Math.max(0, rosterCount - checkinCount);
  }

  await db
    .doc(
      `associations/${associationId}/tournaments/${tournamentId}/stats/${key}`
    )
    .set(
      {
        dateKey: key,
        todayMatchCount,
        unassignedRefMatchCount,
        uncheckedPlayerCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

