/**
 * 🔥 팀 경기 기록 변경 시 통계 자동 재계산
 * 
 * Trigger: team_games/{gameId} onWrite
 * 
 * 핵심 원칙: 완료 시 전체 재계산 (안정성 우선)
 * 
 * Actions:
 * 1. 경기 생성/수정/삭제 감지
 * 2. 관련 팀(homeTeamId, awayTeamId) 통계 재계산
 * 3. teams.stats 업데이트
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

interface TeamStats {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  winRate: number;
  lastResult: "win" | "draw" | "loss" | null;
  streakType: "win" | "loss" | "draw" | "none";
  streakCount: number;
  lastUpdatedAt: admin.firestore.Timestamp;
}

export const onTeamGameWrite = functions.firestore
  .document("team_games/{gameId}")
  .onWrite(async (change, context) => {
    const { gameId } = context.params;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    logger.info("🔄 [onTeamGameWrite] 경기 기록 변경 감지:", {
      gameId,
      beforeStatus: before?.status,
      afterStatus: after?.status,
      eventType: before ? (after ? "update" : "delete") : "create",
    });

    try {
      // 삭제된 경우
      if (!after && before) {
        const { homeTeamId, awayTeamId } = before;
        logger.info("🗑️ [onTeamGameWrite] 경기 삭제 감지, 통계 재계산:", {
          gameId,
          homeTeamId,
          awayTeamId,
        });

        await Promise.all([
          rebuildTeamStats(homeTeamId),
          rebuildTeamStats(awayTeamId),
        ]);

        return;
      }

      // 생성/수정된 경우
      if (after) {
        const { homeTeamId, awayTeamId, status } = after;

        // completed 상태인 경기만 통계에 반영
        if (status === "completed") {
          logger.info("✅ [onTeamGameWrite] 완료 경기 감지, 통계 재계산:", {
            gameId,
            homeTeamId,
            awayTeamId,
          });

          await Promise.all([
            rebuildTeamStats(homeTeamId),
            rebuildTeamStats(awayTeamId),
          ]);
        } else {
          // scheduled → cancelled 등 상태 변경 시에도 재계산
          // (이전에 completed였다가 취소된 경우 대비)
          if (before?.status === "completed" && status !== "completed") {
            logger.info("🔄 [onTeamGameWrite] 완료 → 취소 변경, 통계 재계산:", {
              gameId,
              homeTeamId,
              awayTeamId,
            });

            await Promise.all([
              rebuildTeamStats(homeTeamId),
              rebuildTeamStats(awayTeamId),
            ]);
          }
        }
      }
    } catch (error: any) {
      logger.error("❌ [onTeamGameWrite] 통계 재계산 실패:", {
        gameId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 경기 기록은 유지 (통계만 실패)
    }
  });

/**
 * 팀 통계 재계산 (완료된 경기만 집계)
 */
async function rebuildTeamStats(teamId: string): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);
  const teamDoc = await teamRef.get();

  if (!teamDoc.exists) {
    logger.warn("⚠️ [rebuildTeamStats] 팀 문서가 없음:", { teamId });
    return;
  }

  logger.info("🔄 [rebuildTeamStats] 통계 재계산 시작:", { teamId });

  // 해당 팀의 완료된 경기만 조회
  const [homeGamesSnap, awayGamesSnap] = await Promise.all([
    db.collection("team_games")
      .where("homeTeamId", "==", teamId)
      .where("status", "==", "completed")
      .get(),
    db.collection("team_games")
      .where("awayTeamId", "==", teamId)
      .where("status", "==", "completed")
      .get(),
  ]);

  const allGames = [
    ...homeGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isHome: true })),
    ...awayGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isHome: false })),
  ];

  // 중복 제거 (이론적으로는 없어야 하지만 안전을 위해)
  const uniqueGames = Array.from(
    new Map(allGames.map((game: any) => [game.id, game])).values()
  );

  // 날짜순 정렬 (최신순)
  uniqueGames.sort((a: any, b: any) => {
    const aTime = a.playedAt?.toMillis() || a.scheduledAt?.toMillis() || 0;
    const bTime = b.playedAt?.toMillis() || b.scheduledAt?.toMillis() || 0;
    return bTime - aTime;
  });

  // 통계 계산
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  const results: Array<"win" | "draw" | "loss"> = [];

  for (const game of uniqueGames as any[]) {
    const isHome = game.isHome;
    const teamScore = isHome ? (game.homeScore || 0) : (game.awayScore || 0);
    const opponentScore = isHome ? (game.awayScore || 0) : (game.homeScore || 0);

    // 점수가 없으면 스킵
    if (typeof teamScore !== "number" || typeof opponentScore !== "number") {
      continue;
    }

    goalsFor += teamScore;
    goalsAgainst += opponentScore;

    if (teamScore > opponentScore) {
      wins++;
      results.push("win");
    } else if (teamScore < opponentScore) {
      losses++;
      results.push("loss");
    } else {
      draws++;
      results.push("draw");
    }
  }

  const games = uniqueGames.length;
  const goalDiff = goalsFor - goalsAgainst;
  const winRate = games > 0 ? wins / games : 0;

  // 최근 결과
  const lastResult = results.length > 0 ? results[0] : null;

  // 연속 기록 계산
  const streak = calculateStreak(results);

  const newStats: TeamStats = {
    games,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff,
    winRate,
    lastResult,
    streakType: streak.type,
    streakCount: streak.count,
    lastUpdatedAt: admin.firestore.Timestamp.now(),
  };

  await teamRef.update({
    stats: newStats,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info("✅ [rebuildTeamStats] 통계 재계산 완료:", {
    teamId,
    games,
    wins,
    draws,
    losses,
    winRate: winRate.toFixed(3),
    streakType: streak.type,
    streakCount: streak.count,
  });
}

/**
 * 연속 기록 계산
 */
function calculateStreak(
  results: Array<"win" | "draw" | "loss">
): { type: "win" | "loss" | "draw" | "none"; count: number } {
  if (results.length === 0) {
    return { type: "none", count: 0 };
  }

  const firstResult = results[0];
  let count = 1;

  for (let i = 1; i < results.length; i++) {
    if (results[i] === firstResult) {
      count++;
    } else {
      break;
    }
  }

  return {
    type: firstResult,
    count,
  };
}
