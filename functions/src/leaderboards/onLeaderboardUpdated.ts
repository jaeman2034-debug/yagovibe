/**
 * 🔔 Leaderboard 업데이트 시 알림 트리거
 * 
 * Trigger: leaderboards/{leaderboardId} onUpdate
 * 
 * 역할:
 * - 리더보드 순위 변화 감지
 * - Top 3 진입 시 선수에게 알림
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { notifyLeaderboardRankChanged } from "../notifications/platformNotificationService";

const db = getFirestore();

export const onLeaderboardUpdated = onDocumentUpdated(
  {
    document: "leaderboards/{leaderboardId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const { leaderboardId } = event.params;
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) {
      logger.warn("⚠️ [onLeaderboardUpdated] 문서가 없음:", { leaderboardId });
      return;
    }

    logger.info("🔄 [onLeaderboardUpdated] Leaderboard 변경 감지:", {
      leaderboardId,
      eventId: after.eventId,
      category: after.category,
    });

    try {
      const { eventId, category, leaderboard } = after;

      if (!eventId || !category || !leaderboard || !Array.isArray(leaderboard)) {
        logger.warn("⚠️ [onLeaderboardUpdated] 필수 필드 없음:", {
          leaderboardId,
          eventId,
          category,
        });
        return;
      }

      // 이전 순위 저장
      const beforeLeaderboard = before.leaderboard || [];
      const beforeRankMap = new Map<string, number>();
      beforeLeaderboard.forEach((row: any, index: number) => {
        if (row.playerId) {
          beforeRankMap.set(row.playerId, index + 1);
        }
      });

      // 순위 변화 감지 및 알림
      const notificationPromises: Promise<void>[] = [];

      leaderboard.forEach((row: any, index: number) => {
        if (!row.playerId) return;

        const newRank = index + 1;
        const oldRank = beforeRankMap.get(row.playerId);

        // 순위가 변경되었고, Top 3 진입/유지인 경우 알림
        if (oldRank !== newRank && newRank <= 3) {
          notificationPromises.push(
            notifyLeaderboardRankChanged(
              row.playerId,
              eventId,
              category as "goals" | "assists" | "appearances",
              newRank,
              oldRank
            )
          );
        }
      });

      if (notificationPromises.length > 0) {
        await Promise.all(notificationPromises);
        logger.info("✅ [onLeaderboardUpdated] 순위 변화 알림 전송 완료:", {
          leaderboardId,
          notificationCount: notificationPromises.length,
        });
      }
    } catch (error: any) {
      logger.error("❌ [onLeaderboardUpdated] 처리 실패:", {
        leaderboardId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 리더보드는 유지
    }
  }
);
