import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { buildFeePaymentCorrelationId } from "../lib/feePaymentCorrelationId";
import { INVALID_FCM_REGISTRATION_ERROR_CODES } from "../lib/cleanupInvalidFcmTokensForUser";
import { applyDeferredInvalidFcmTokenCleanup } from "../lib/fcmInvalidTokenDeferred";
import { getFcmTokensForUser } from "../lib/fcmUserTokens";
import { tryClaimPushDedup } from "../lib/pushNotificationDedup";
import { bumpTeamNotificationExperimentMetric } from "../lib/notificationExperimentMetrics";

function resolveNotificationCorrelationId(
  data: Record<string, unknown>,
  notifType: string,
  userId: string
): string {
  const stored = typeof data.correlationId === "string" ? data.correlationId.trim() : "";
  if (stored) return stored;
  const feeId = typeof data.feeId === "string" ? data.feeId.trim() : "";
  const feeRelated =
    notifType === "fee_reminder" ||
    notifType === "fee_due_reminder" ||
    notifType === "fee_overdue_reminder" ||
    notifType === "non_responder_reminder" ||
    notifType === "billing_re_register_request" ||
    notifType.startsWith("fee_");
  if (feeRelated && feeId && userId) {
    return buildFeePaymentCorrelationId(feeId, userId);
  }
  return "";
}

/** v2 `onDocumentCreated` 이벤트 — 스냅/params 형태만 사용 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleSendPushOnNotificationCreate(event: any): Promise<void> {
  const snap = event.data;
  const data =
    snap && typeof snap.data === "function"
      ? (snap.data() as Record<string, unknown> | undefined)
      : undefined;
  if (!data) return;

  const userId = typeof data.targetUid === "string" ? data.targetUid : data.userId;
  if (!userId || typeof userId !== "string") return;

  const notificationRef =
    snap && typeof snap.ref === "object" && snap.ref ? snap.ref : null;
  const requestedStatus = typeof data.status === "string" ? data.status : "queued";
  if (requestedStatus !== "queued") {
    return;
  }

  const notifType = typeof data.type === "string" ? data.type : "";
  const teamIdFromData = typeof data.teamId === "string" && data.teamId.trim() ? data.teamId.trim() : "";
  const correlationId = resolveNotificationCorrelationId(data, notifType, userId);

  const title = (data.title as string) || "알림";
  const body = (data.body as string) || (data.message as string) || "새로운 알림이 도착했습니다.";
  const experimentId = typeof data.experiment === "string" ? data.experiment.trim() : "";
  const abVariant = data.variant === "A" || data.variant === "B" ? data.variant : null;
  const usesAbCopy = Boolean(experimentId && abVariant);
  const route = (() => {
    /** 서버가 notifications에 넣은 내부 경로 (팀 가입 승인 등) — 오픈 리다이렉트 방지 */
    const explicitLink = data.link;
    if (
      typeof explicitLink === "string" &&
      explicitLink.length > 0 &&
      explicitLink.startsWith("/") &&
      !explicitLink.startsWith("//") &&
      !explicitLink.includes("://")
    ) {
      return explicitLink;
    }

    const target = (data.target as Record<string, unknown>) || {};
    const screen = target.screen as string | undefined;
    const id = target.id as string | undefined;
    const params = (target.params as Record<string, unknown>) || {};
    const associationId = params.associationId as string | undefined;
    const payload = (data.payload as Record<string, unknown>) || {};
    const roomType = String(payload.roomType || "").toLowerCase();

    if (screen === "association_post") {
      if (associationId && id) return `/association/${associationId}/posts/${id}`;
      if (associationId) return `/association/${associationId}`;
    }
    if (screen === "association" && id) return `/association/${id}`;
    if (screen === "chat" && id) {
      if (roomType === "recruit_group") return `/chat/${encodeURIComponent(id)}`;
      return `/app/chat/${encodeURIComponent(id)}`;
    }
    if (screen === "trade" && id) return `/app/trade/${id}`;
    if (screen === "item" && id) return `/app/market/${id}`;
    if (
      teamIdFromData &&
      (notifType === "fee_reminder" ||
        notifType === "billing_re_register_request" ||
        notifType === "inactive_team_alert" ||
        notifType === "billing_past_due_day0" ||
        notifType === "billing_past_due_day3" ||
        notifType === "billing_restricted" ||
        notifType === "billing_recovered")
    ) {
      return `/team/${encodeURIComponent(teamIdFromData)}?tab=home`;
    }
    return "/home";
  })();

  let pushTitle = title;
  let pushBody = body;
  if (usesAbCopy) {
    pushTitle = title;
    pushBody = body;
  } else if (notifType === "billing_re_register_request") {
    pushTitle = "카드 정보 확인 필요";
    pushBody = "자동결제가 실패했습니다. 카드 정보를 다시 등록해 주세요.";
  } else if (notifType === "fee_reminder") {
    pushTitle = title || "회비 안내";
    pushBody = body || "회비 납부를 확인해 주세요.";
  }

  const db = getFirestore();
  const messaging = getMessaging();
  try {
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      if (notificationRef) {
        await notificationRef.update({
          status: "failed",
          error: "User not found",
        });
      }
      return;
    }

    const notificationId = String(event.params?.notificationId ?? event.params?.id ?? "");
    const writerDedup =
      typeof data.pushDedupKey === "string" && data.pushDedupKey.trim().length > 0
        ? data.pushDedupKey.trim().slice(0, 1400)
        : "";
    const dedupKey = (writerDedup || `notif_fcm_${notificationId}`).slice(0, 1400);
    const shouldSendPush = await tryClaimPushDedup(db, dedupKey, {
      userId,
      notificationId,
      type: notifType,
    });
    if (!shouldSendPush) {
      if (correlationId) {
        logger.warn("🔔 notification_event", {
          level: "warn",
          phase: "notification_push",
          action: "push_dedup_skip",
          correlationId,
          notificationId,
          userId,
          notifType,
        });
      }
      return;
    }

    const allTokens = await getFcmTokensForUser(db, userId);
    if (allTokens.length === 0) {
      if (correlationId) {
        logger.warn("🔔 notification_event", {
          level: "warn",
          phase: "notification_push",
          action: "push_no_fcm_tokens",
          correlationId,
          notificationId,
          userId,
          notifType,
        });
      }
      if (notificationRef) {
        await notificationRef.update({
          status: "failed",
          error: "No FCM tokens",
        });
      }
      return;
    }

    const response = await messaging.sendEachForMulticast({
      tokens: allTokens,
      notification: { title: pushTitle, body: pushBody },
      webpush: {
        notification: {
          title: pushTitle,
          body: pushBody,
          icon: "/icons/icon-maskable-512.png",
          badge: "/icons/icon-maskable-512.png",
        },
        fcmOptions: {
          link: route,
        },
      },
      data: {
        route: String(route),
        type: String(notifType),
        teamId: String(teamIdFromData || ""),
        feeId: String(typeof data.feeId === "string" ? data.feeId : ""),
        notificationId: String(event.params?.notificationId ?? event.params?.id ?? ""),
        experiment: String(experimentId || ""),
        variant: String(abVariant || ""),
        correlationId: String(correlationId || ""),
      },
    });

    const invalidTokens: string[] = [];
    response.responses.forEach((r, idx) => {
      const code = (r.error as { code?: string } | undefined)?.code;
      if (!r.success && code && INVALID_FCM_REGISTRATION_ERROR_CODES.has(code)) {
        invalidTokens.push(allTokens[idx]);
      }
    });

    if (invalidTokens.length > 0) {
      await applyDeferredInvalidFcmTokenCleanup(db, userId, invalidTokens);
    }

    const successCount = response.responses.filter((r) => r.success).length;
    if (notificationRef) {
      if (successCount > 0) {
        await notificationRef.update({
          status: "sent",
          sentAt: new Date(),
          error: null,
        });
        if (correlationId) {
          logger.info("🔔 notification_event", {
            level: "info",
            phase: "notification_push",
            action: "fcm_sent",
            correlationId,
            notificationId,
            userId,
            notifType,
            successCount,
          });
        }
        if (usesAbCopy && teamIdFromData && abVariant) {
          try {
            await bumpTeamNotificationExperimentMetric(
              db,
              teamIdFromData,
              experimentId,
              abVariant,
              "sent"
            );
          } catch {
            // 집계 실패 무시
          }
        }
      } else {
        const firstError = response.responses.find((r) => !r.success)?.error?.message || "FCM send failed";
        if (correlationId) {
          logger.error("🔔 notification_event", {
            level: "error",
            phase: "notification_push",
            action: "fcm_all_failed",
            correlationId,
            notificationId,
            userId,
            notifType,
            error: firstError,
          });
        }
        await notificationRef.update({
          status: "failed",
          error: firstError,
        });
      }
    }
  } catch (error) {
    if (notificationRef) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await notificationRef.update({
        status: "failed",
        error: message,
      });
    }
    throw error;
  }
}
