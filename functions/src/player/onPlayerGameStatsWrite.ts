/**
 * 🔥 선수 경기 기록 변경 시 통계 자동 재계산
 * 
 * Trigger: player_game_stats/{id} onWrite
 * 
 * 핵심 원칙: 완료 시 전체 재계산 (안정성 우선)
 * 
 * Actions:
 * 1. 선수 기록 생성/수정/삭제 감지
 * 2. 해당 선수의 통계 재계산
 * 3. player_stats 업데이트
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

export const onPlayerGameStatsWrite = functions.firestore
  .document("player_game_stats/{statsId}")
  .onWrite(async (change, context) => {
    const { statsId } = context.params;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    logger.info("🔄 [onPlayerGameStatsWrite] 선수 기록 변경 감지:", {
      statsId,
      playerId: after?.playerId || before?.playerId,
      eventType: before ? (after ? "update" : "delete") : "create",
    });

    try {
      const playerId = after?.playerId || before?.playerId;

      if (!playerId) {
        logger.warn("⚠️ [onPlayerGameStatsWrite] playerId 없음:", { statsId });
        return;
      }

      // 선수 통계 재계산
      await rebuildPlayerStats(playerId);
    } catch (error: any) {
      logger.error("❌ [onPlayerGameStatsWrite] 통계 재계산 실패:", {
        statsId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 기록은 유지 (통계만 실패)
    }
  });

/**
 * 선수 통계 재계산 (모든 경기 기록 집계)
 */
async function rebuildPlayerStats(playerId: string): Promise<void> {
  logger.info("🔄 [rebuildPlayerStats] 통계 재계산 시작:", { playerId });

  // 해당 선수의 모든 경기 기록 조회
  const statsSnap = await db.collection("player_game_stats")
    .where("playerId", "==", playerId)
    .get();

  if (statsSnap.empty) {
    // 기록이 없으면 통계 초기화
    await db.doc(`player_stats/${playerId}`).set({
      playerId,
      games: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      goalsPerGame: 0,
      assistsPerGame: 0,
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.info("✅ [rebuildPlayerStats] 통계 초기화:", { playerId });
    return;
  }

  // 통계 계산
  let games = 0;
  let goals = 0;
  let assists = 0;
  let shots = 0;
  let passes = 0;
  let totalMinutesPlayed = 0;
  let yellowCards = 0;
  let redCards = 0;
  let lastGameAt: admin.firestore.Timestamp | null = null;

  // sportType은 첫 번째 기록에서 가져옴
  let sportType = "";

  statsSnap.forEach((doc) => {
    const data = doc.data();
    
    if (!sportType && data.sportType) {
      sportType = data.sportType;
    }

    games++;
    goals += data.goals || 0;
    assists += data.assists || 0;
    shots += data.shots || 0;
    passes += data.passes || 0;
    totalMinutesPlayed += data.minutesPlayed || 0;
    yellowCards += data.yellowCards || 0;
    redCards += data.redCards || 0;

    // 마지막 경기 날짜 업데이트
    if (data.createdAt) {
      const createdAt = data.createdAt as admin.firestore.Timestamp;
      if (!lastGameAt || createdAt.toMillis() > lastGameAt.toMillis()) {
        lastGameAt = createdAt;
      }
    }
  });

  const goalsPerGame = games > 0 ? goals / games : 0;
  const assistsPerGame = games > 0 ? assists / games : 0;

  const newStats = {
    playerId,
    sportType: sportType || "football",
    games,
    goals,
    assists,
    shots: shots > 0 ? shots : undefined,
    passes: passes > 0 ? passes : undefined,
    totalMinutesPlayed: totalMinutesPlayed > 0 ? totalMinutesPlayed : undefined,
    yellowCards,
    redCards,
    goalsPerGame,
    assistsPerGame,
    lastGameAt: lastGameAt || admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.doc(`player_stats/${playerId}`).set(newStats, { merge: true });

  logger.info("✅ [rebuildPlayerStats] 통계 재계산 완료:", {
    playerId,
    games,
    goals,
    assists,
    goalsPerGame: goalsPerGame.toFixed(2),
    assistsPerGame: assistsPerGame.toFixed(2),
  });
}
