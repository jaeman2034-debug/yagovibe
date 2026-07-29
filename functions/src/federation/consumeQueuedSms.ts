/**
 * PR4 Sprint C — consume queued_sms_pending (SMS or Kakao via factory).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { isFederationManagerDoc } from "../lib/applyFederationTeamContactRoster";
import { NotificationProviderFactory } from "../lib/kakao/notificationProviderFactory";
import { processOutboundNotificationDoc } from "../lib/notifications/processOutboundQueueItem";

const REGION = "asia-northeast3";

export const consumeQueuedSms = onCall(
  { region: REGION, maxInstances: 5, timeoutSeconds: 120 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const d = (request.data || {}) as Record<string, unknown>;
    const federationSlug =
      typeof d.federationSlug === "string" ? d.federationSlug.trim() : "";
    const limitN = Math.min(
      30,
      Math.max(1, typeof d.limit === "number" ? Math.floor(d.limit) : 10)
    );
    const notificationId =
      typeof d.notificationId === "string" ? d.notificationId.trim() : "";

    if (!federationSlug) {
      throw new HttpsError("invalid-argument", "federationSlug가 필요합니다.");
    }

    const db = getFirestore();
    const fedSnap = await db.collection("federations").doc(federationSlug).get();
    if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
    if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown>, uid)) {
      throw new HttpsError("permission-denied", "협회 관리자만 실행할 수 있습니다.");
    }

    const factory = NotificationProviderFactory();
    let docs;
    if (notificationId) {
      const one = await db.collection("notifications").doc(notificationId).get();
      docs = one.exists ? [one] : [];
    } else {
      const snap = await db
        .collection("notifications")
        .where("status", "==", "queued_sms_pending")
        .where("federationSlug", "==", federationSlug)
        .limit(limitN)
        .get()
        .catch(async () =>
          db
            .collection("notifications")
            .where("status", "==", "queued_sms_pending")
            .limit(limitN * 3)
            .get()
        );
      docs = snap.docs.filter((doc) => {
        const raw = doc.data();
        const slug =
          raw.federationSlug ||
          (raw.payload && typeof raw.payload === "object"
            ? (raw.payload as { federationSlug?: string }).federationSlug
            : "");
        return slug === federationSlug;
      });
    }

    const results = [];
    for (const doc of docs) {
      const raw = doc.data() as Record<string, unknown>;
      if (raw.status !== "queued_sms_pending" && raw.status !== "sending") {
        // allow single retry path via retryFailedNotifications; skip non-pending on bulk
        if (!notificationId) continue;
      }
      results.push(
        await processOutboundNotificationDoc(db, doc, { actorUid: uid })
      );
    }

    logger.info("[consumeQueuedSms] done", {
      federationSlug,
      resolved: factory.resolved,
      mode: factory.mode,
      count: results.length,
    });

    return {
      ok: true,
      providerMode: factory.resolved,
      notificationProviderMode: factory.mode,
      kakaoStub: factory.kakao.isStub,
      processed: results.length,
      results,
    };
  }
);
