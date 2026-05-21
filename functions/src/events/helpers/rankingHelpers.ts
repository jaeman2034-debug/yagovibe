/**
 * 🔥 Ranking 업데이트 헬퍼 함수
 * 
 * 역할: Event/Division별 순위 계산 및 업데이트
 */

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export interface RankingStats {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

/**
 * Event Division Rankings 업데이트
 */
export async function updateEventDivisionRankings(
  eventId: string,
  divisionId: string
): Promise<void> {
  const db = getFirestore();
  
  // 해당 division의 완료된 경기만 조회
  const matchesSnap = await db
    .collection("event_matches")
    .where("eventId", "==", eventId)
    .where("divisionId", "==", divisionId)
    .where("status", "==", "completed")
    .get();

  // 팀별 통계 집계
  const teamStatsMap = new Map<string, RankingStats>();

  matchesSnap.docs.forEach((doc) => {
    const match = doc.data();
    const { homeTeamId, awayTeamId, homeScore, awayScore } = match;

    if (
      typeof homeScore !== "number" ||
      typeof awayScore !== "number"
    ) {
      return;
    }

    // 홈팀 통계
    const homeStats = teamStatsMap.get(homeTeamId) || {
      teamId: homeTeamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    };

    homeStats.played++;
    homeStats.goalsFor += homeScore;
    homeStats.goalsAgainst += awayScore;
    homeStats.goalDiff = homeStats.goalsFor - homeStats.goalsAgainst;

    if (homeScore > awayScore) {
      homeStats.won++;
      homeStats.points += 3;
    } else if (homeScore === awayScore) {
      homeStats.drawn++;
      homeStats.points += 1;
    } else {
      homeStats.lost++;
    }

    teamStatsMap.set(homeTeamId, homeStats);

    // 어웨이팀 통계
    const awayStats = teamStatsMap.get(awayTeamId) || {
      teamId: awayTeamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    };

    awayStats.played++;
    awayStats.goalsFor += awayScore;
    awayStats.goalsAgainst += homeScore;
    awayStats.goalDiff = awayStats.goalsFor - awayStats.goalsAgainst;

    if (awayScore > homeScore) {
      awayStats.won++;
      awayStats.points += 3;
    } else if (awayScore === homeScore) {
      awayStats.drawn++;
      awayStats.points += 1;
    } else {
      awayStats.lost++;
    }

    teamStatsMap.set(awayTeamId, awayStats);
  });

  // 순위 계산 (승점 → 득실차 → 다득점)
  const rankings = Array.from(teamStatsMap.values())
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      return b.goalsFor - a.goalsFor;
    })
    .map((stats, index) => ({
      ...stats,
      rank: index + 1,
    }));

  // rankings 업데이트
  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  for (const ranking of rankings) {
    const rankingId = `ranking_${eventId}_${divisionId}_${ranking.teamId}`;
    const rankingRef = db.doc(`rankings/${rankingId}`);

    // 팀명 조회
    const teamDoc = await db.doc(`teams/${ranking.teamId}`).get();
    const teamName = teamDoc.exists ? teamDoc.data()?.name : "Unknown";

    batch.set(rankingRef, {
      scope: "event_division",
      eventId,
      divisionId,
      teamId: ranking.teamId,
      teamName,
      played: ranking.played,
      won: ranking.won,
      drawn: ranking.drawn,
      lost: ranking.lost,
      goalsFor: ranking.goalsFor,
      goalsAgainst: ranking.goalsAgainst,
      goalDiff: ranking.goalDiff,
      points: ranking.points,
      rank: ranking.rank,
      updatedAt: now,
    }, { merge: true });
  }

  await batch.commit();
}
