/**
 * PR4 Sprint C — Auto-consume queued_sms_pending when Live Kakao (or live SMS) is ready.
 * Operators do not need to press Ops Center buttons for approve/payment flows.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { isKakaoLiveConfigured } from "../lib/kakao/kakaoAlimTalkProvider";
import { resolveSmsProviderMode } from "../lib/sms/smsProviderConfig";
import { processOutboundNotificationDoc } from "../lib/notifications/processOutboundQueueItem";
import { NotificationProviderFactory } from "../lib/kakao/notificationProviderFactory";

function autoOutboundEnabled(): boolean {
  const factory = NotificationProviderFactory();
  if (factory.resolved === "kakao" && isKakaoLiveConfigured()) return true;
  if (factory.resolved === "sms" && resolveSmsProviderMode() === "sens") return true;
  return false;
}

export const onQueuedOutboundNotification = onDocumentWritten(
  {
    document: "notifications/{notificationId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const raw = after.data() as Record<string, unknown>;
    if (raw.status !== "queued_sms_pending") return;

    const prevStatus = before ? String(before.status || "") : "";
    // Only auto-fire on transition into queue (create or requeue), not every write
    if (prevStatus === "queued_sms_pending") return;
    if (prevStatus === "sending") return;

    if (!autoOutboundEnabled()) {
      logger.info("[onQueuedOutboundNotification] skip — live provider not ready", {
        id: after.id,
        resolved: NotificationProviderFactory().resolved,
      });
      return;
    }

    try {
      const result = await processOutboundNotificationDoc(after.ref.firestore, after, {
        actorUid: "system_auto",
      });
      logger.info("[onQueuedOutboundNotification] processed", result);
    } catch (e) {
      logger.warn("[onQueuedOutboundNotification] failed", {
        id: after.id,
        e: String(e),
      });
    }
  }
);
