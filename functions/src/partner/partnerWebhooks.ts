/**
 * 🔥 파트너 웹훅 트리거 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 거래 완료 시 파트너 웹훅 호출
 * - 매물 생성/수정 시 웹훅 호출
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { broadcastWebhook } from "./webhooks";

/**
 * 거래 완료 시 파트너 웹훅 호출
 */
export const onTradeConfirmedWebhook = onDocumentUpdated(
  {
    document: "trades/{tradeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    // 🔥 거래 완료 상태 변경 감지
    if (before.status !== "CONFIRMED" && after.status === "CONFIRMED") {
      const tradeId = event.params.tradeId;

      try {
        await broadcastWebhook({
          type: "TRADE_CONFIRMED",
          data: {
            tradeId,
            sellerId: after.sellerId,
            buyerId: after.buyerId,
            amount: after.amount,
            confirmedAt: after.confirmedAt,
          },
          timestamp: new Date(),
        });

        logger.info("[onTradeConfirmedWebhook] 웹훅 전송 완료:", { tradeId });
      } catch (error: any) {
        logger.error("[onTradeConfirmedWebhook] 웹훅 전송 실패:", {
          tradeId,
          error: error.message,
        });
      }
    }
  }
);

/**
 * 매물 생성 시 파트너 웹훅 호출
 */
export const onItemCreatedWebhook = onDocumentCreated(
  {
    document: "market/{itemId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      return;
    }

    const itemId = event.params.itemId;

    // 🔥 파트너가 등록한 매물인 경우만
    if (data.partnerId) {
      try {
        await broadcastWebhook({
          type: "ITEM_CREATED",
          data: {
            itemId,
            partnerId: data.partnerId,
            title: data.title,
            category: data.category,
            createdAt: data.createdAt,
          },
          timestamp: new Date(),
        });

        logger.info("[onItemCreatedWebhook] 웹훅 전송 완료:", { itemId });
      } catch (error: any) {
        logger.error("[onItemCreatedWebhook] 웹훅 전송 실패:", {
          itemId,
          error: error.message,
        });
      }
    }
  }
);
