/**
 * 🔥 웹훅 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 이벤트 발생 시 파트너 웹훅 호출
 * - 재시도 로직
 * - 이벤트 타입 관리
 */

import { logger } from "firebase-functions/v2";
import { db } from "../firebase";
import axios from "axios";

/**
 * 웹훅 이벤트 타입
 */
export type WebhookEventType =
  | "TRADE_CONFIRMED"
  | "TRADE_CANCELLED"
  | "ITEM_CREATED"
  | "ITEM_UPDATED"
  | "PAYMENT_COMPLETED";

/**
 * 웹훅 이벤트 데이터
 */
export interface WebhookEvent {
  type: WebhookEventType;
  data: any;
  timestamp: Date;
}

/**
 * 웹훅 전송
 */
export async function sendWebhook(
  partnerId: string,
  event: WebhookEvent
): Promise<void> {
  const partnerSnap = await db.collection("partners").doc(partnerId).get();

  if (!partnerSnap.exists) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const partner = partnerSnap.data() as any;

  if (!partner.webhookUrl) {
    logger.info("[sendWebhook] 웹훅 URL 없음:", { partnerId });
    return;
  }

  if (partner.status !== "ACTIVE") {
    logger.info("[sendWebhook] 비활성 파트너:", { partnerId });
    return;
  }

  try {
    // 🔥 웹훅 전송 (fetch 사용)
    const response = await fetch(partner.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": partner.apiKey,
      },
      body: JSON.stringify({
        event: event.type,
        data: event.data,
        timestamp: event.timestamp,
        partnerId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    logger.info("[sendWebhook] 웹훅 전송 성공:", {
      partnerId,
      eventType: event.type,
      status: response.status,
    });
  } catch (error: any) {
    logger.error("[sendWebhook] 웹훅 전송 실패:", {
      partnerId,
      eventType: event.type,
      error: error.message,
      url: partner.webhookUrl,
    });

    // 🔥 실패 시 재시도 큐에 추가 (선택적)
    await db.collection("webhookRetries").add({
      partnerId,
      event,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: new Date(Date.now() + 60 * 1000), // 1분 후 재시도
      createdAt: new Date(),
    });
  }
}

/**
 * 모든 활성 파트너에게 웹훅 전송
 */
export async function broadcastWebhook(event: WebhookEvent): Promise<void> {
  const partnersSnap = await db
    .collection("partners")
    .where("status", "==", "ACTIVE")
    .where("scopes", "array-contains", "WEBHOOK")
    .get();

  const promises = partnersSnap.docs.map((doc) =>
    sendWebhook(doc.id, event).catch((err) => {
      logger.warn("[broadcastWebhook] 파트너 웹훅 실패:", {
        partnerId: doc.id,
        error: err.message,
      });
    })
  );

  await Promise.allSettled(promises);

  logger.info("[broadcastWebhook] 웹훅 브로드캐스트 완료:", {
    eventType: event.type,
    partnerCount: partnersSnap.size,
  });
}
