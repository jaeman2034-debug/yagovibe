/**
 * 🔥 Player Game 작성 시 자동 집계
 * 
 * Trigger: player_games/{playerGameId} onWrite
 * 
 * 역할:
 * 1. player_event_summary 업데이트
 * 2. player_season_summary 업데이트
 * 3. player_summary 업데이트
 * 4. player_match_history 생성
 * 5. leaderboards 업데이트
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { admin } from "../firebaseAdmin";
import { aggregatePlayerEventSummary } from "./aggregatePlayerEventSummary";
import { aggregatePlayerSeasonSummary } from "./aggregatePlayerSeasonSummary";
import { aggregatePlayerSummary } from "./aggregatePlayerSummary";
import { createPlayerMatchHistory } from "./createPlayerMatchHistory";
import { updateLeaderboards } from "../leaderboards/updateLeaderboards";

const db = getFirestore();

export const onPlayerGameWrite = onDocumentWritten(
  {
    document: "player_games/{playerGameId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const { playerGameId } = event.params;
    const after = event.data?.after?.data();

    // 삭제된 경우 스킵
    if (!after) {
      logger.info("ℹ️ [onPlayerGameWrite] player_game 삭제됨, 스킵:", { playerGameId });
      return;
    }

    const { playerId, eventId, seasonId, teamId, matchId } = after;

    if (!playerId || !matchId) {
      logger.warn("⚠️ [onPlayerGameWrite] 필수 필드 누락:", {
        playerGameId,
        playerId,
        matchId,
      });
      return;
    }

    logger.info("🔄 [onPlayerGameWrite] Player Game 집계 시작:", {
      playerGameId,
      playerId,
      eventId,
      matchId,
    });

    try {
      // 병렬로 모든 집계 작업 실행
      await Promise.all([
        // 1. Event Summary 업데이트
        eventId
          ? aggregatePlayerEventSummary(playerId, eventId, after.divisionId || null)
          : Promise.resolve(),

        // 2. Season Summary 업데이트
        seasonId
          ? aggregatePlayerSeasonSummary(playerId, seasonId)
          : Promise.resolve(),

        // 3. Player Summary 업데이트
        aggregatePlayerSummary(playerId),

        // 4. Match History 생성
        createPlayerMatchHistory(after),

        // 5. Leaderboards 업데이트
        eventId
          ? updateLeaderboards(eventId, after.divisionId || null)
          : Promise.resolve(),
      ]);

      logger.info("✅ [onPlayerGameWrite] Player Game 집계 완료:", {
        playerGameId,
        playerId,
      });
    } catch (error: any) {
      logger.error("❌ [onPlayerGameWrite] 집계 실패:", {
        playerGameId,
        playerId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 원본 데이터는 유지
    }
  }
);
