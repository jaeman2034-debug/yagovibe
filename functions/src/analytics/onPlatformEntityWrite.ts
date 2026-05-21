/**
 * 🔥 Platform Entity 변경 시 통계 업데이트
 * 
 * Trigger: events, teams, players, event_matches, player_games 변경 시
 * 
 * 역할:
 * - platform_stats/global 자동 업데이트
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { updatePlatformStats } from "./updatePlatformStats";

/**
 * Events 변경 시 통계 업데이트
 */
export const onEventWrite = onDocumentWritten(
  {
    document: "events/{eventId}",
    region: "asia-northeast3",
  },
  async () => {
    try {
      await updatePlatformStats();
      logger.info("✅ [onEventWrite] 통계 업데이트 완료");
    } catch (error: any) {
      logger.error("❌ [onEventWrite] 통계 업데이트 실패:", error.message);
      // 에러 발생해도 원본 데이터는 유지
    }
  }
);

/**
 * Teams 변경 시 통계 업데이트
 */
export const onTeamWrite = onDocumentWritten(
  {
    document: "teams/{teamId}",
    region: "asia-northeast3",
  },
  async () => {
    try {
      await updatePlatformStats();
      logger.info("✅ [onTeamWrite] 통계 업데이트 완료");
    } catch (error: any) {
      logger.error("❌ [onTeamWrite] 통계 업데이트 실패:", error.message);
    }
  }
);

/**
 * Players 변경 시 통계 업데이트
 */
export const onPlayerWrite = onDocumentWritten(
  {
    document: "players/{playerId}",
    region: "asia-northeast3",
  },
  async () => {
    try {
      await updatePlatformStats();
      logger.info("✅ [onPlayerWrite] 통계 업데이트 완료");
    } catch (error: any) {
      logger.error("❌ [onPlayerWrite] 통계 업데이트 실패:", error.message);
    }
  }
);

/**
 * Event Matches 변경 시 통계 업데이트
 */
export const onEventMatchWrite = onDocumentWritten(
  {
    document: "event_matches/{matchId}",
    region: "asia-northeast3",
  },
  async () => {
    try {
      await updatePlatformStats();
      logger.info("✅ [onEventMatchWrite] 통계 업데이트 완료");
    } catch (error: any) {
      logger.error("❌ [onEventMatchWrite] 통계 업데이트 실패:", error.message);
    }
  }
);

/**
 * Player Games 변경 시 통계 업데이트 (득점 포함)
 */
export const onPlayerGameWrite = onDocumentWritten(
  {
    document: "player_games/{playerGameId}",
    region: "asia-northeast3",
  },
  async () => {
    try {
      await updatePlatformStats();
      logger.info("✅ [onPlayerGameWrite] 통계 업데이트 완료");
    } catch (error: any) {
      logger.error("❌ [onPlayerGameWrite] 통계 업데이트 실패:", error.message);
    }
  }
);
