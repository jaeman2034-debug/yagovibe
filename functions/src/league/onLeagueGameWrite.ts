/**
 * 🔥 리그 경기 변경 시 순위 자동 재계산
 * 
 * Trigger: league_games/{gameId} onWrite
 * 
 * 핵심 원칙: 완료 시 전체 재계산 (안정성 우선)
 * 
 * Actions:
 * 1. 리그 경기 생성/수정/삭제 감지
 * 2. 해당 리그의 순위 재계산
 * 3. league_standings 업데이트
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

interface LeagueStanding {
  leagueId: string;
  teamId: string;
  teamName: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  lastUpdatedAt: admin.firestore.Timestamp;
}

export const onLeagueGameWrite = functions.firestore
  .document("league_games/{gameId}")
  .onWrite(async (change, context) => {
    const { gameId } = context.params;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    logger.info("🔄 [onLeagueGameWrite] 리그 경기 변경 감지:", {
      gameId,
      leagueId: after?.leagueId || before?.leagueId,
      eventType: before ? (after ? "update" : "delete") : "create",
    });

    try {
      const leagueId = after?.leagueId || before?.leagueId;

      if (!leagueId) {
        logger.warn("⚠️ [onLeagueGameWrite] leagueId 없음:", { gameId });
        return;
      }

      // 리그 순위 재계산
      await rebuildLeagueStandings(leagueId);
    } catch (error: any) {
      logger.error("❌ [onLeagueGameWrite] 순위 재계산 실패:", {
        gameId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 경기 기록은 유지 (순위만 실패)
    }
  });

/**
 * 리그 순위 재계산 (완료된 경기만 집계)
 */
async function rebuildLeagueStandings(leagueId: string): Promise<void> {
  logger.info("🔄 [rebuildLeagueStandings] 순위 재계산 시작:", { leagueId });

  // 해당 리그의 완료된 경기만 조회
  const gamesSnap = await db.collection("league_games")
    .where("leagueId", "==", leagueId)
    .where("status", "==", "completed")
    .get();

  // 팀별 통계 집계
  const teamStatsMap = new Map<string, {
    teamId: string;
    teamName: string;
    games: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  }>();

  gamesSnap.forEach((doc) => {
    const game = doc.data();
    const { homeTeamId, homeTeamName, awayTeamId, awayTeamName, homeScore, awayScore } = game;

    if (typeof homeScore !== "number" || typeof awayScore !== "number") {
      return;
    }

    // 홈팀 통계
    const homeStats = teamStatsMap.get(homeTeamId) || {
      teamId: homeTeamId,
      teamName: homeTeamName,
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };

    homeStats.games++;
    homeStats.goalsFor += homeScore;
    homeStats.goalsAgainst += awayScore;

    if (homeScore > awayScore) {
      homeStats.wins++;
    } else if (homeScore < awayScore) {
      homeStats.losses++;
    } else {
      homeStats.draws++;
    }

    teamStatsMap.set(homeTeamId, homeStats);

    // 원정팀 통계
    const awayStats = teamStatsMap.get(awayTeamId) || {
      teamId: awayTeamId,
      teamName: awayTeamName,
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };

    awayStats.games++;
    awayStats.goalsFor += awayScore;
    awayStats.goalsAgainst += homeScore;

    if (awayScore > homeScore) {
      awayStats.wins++;
    } else if (awayScore < homeScore) {
      awayStats.losses++;
    } else {
      awayStats.draws++;
    }

    teamStatsMap.set(awayTeamId, awayStats);
  });

  // league_standings 업데이트
  const batch = db.batch();
  const standingsRef = db.collection("league_standings");

  for (const [teamId, stats] of teamStatsMap.entries()) {
    const goalDiff = stats.goalsFor - stats.goalsAgainst;
    const points = stats.wins * 3 + stats.draws; // 승점 계산

    const standingId = `${leagueId}_${teamId}`;
    const standingRef = standingsRef.doc(standingId);

    const standingData: LeagueStanding = {
      leagueId,
      teamId,
      teamName: stats.teamName,
      games: stats.games,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      goalDiff,
      points,
      lastUpdatedAt: admin.firestore.Timestamp.now(),
    };

    batch.set(standingRef, standingData, { merge: true });
  }

  await batch.commit();

  logger.info("✅ [rebuildLeagueStandings] 순위 재계산 완료:", {
    leagueId,
    teams: teamStatsMap.size,
  });
}
