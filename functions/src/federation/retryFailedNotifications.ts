/**
 * PR4 Sprint C — Single / Bulk retry for failed outbound notifications.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { isFederationManagerDoc } from "../lib/applyFederationTeamContactRoster";
import { processOutboundNotificationDoc } from "../lib/notifications/processOutboundQueueItem";

const REGION = "asia-northeast3";

export const retryFailedNotifications = onCall(
  { region: REGION, maxInstances: 5, timeoutSeconds: 120 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const d = (request.data || {}) as Record<string, unknown>;
    const federationSlug =
      typeof d.federationSlug === "string" ? d.federationSlug.trim() : "";
    const notificationId =
      typeof d.notificationId === "string" ? d.notificationId.trim() : "";
    const bulk = d.bulk === true;
    const limitN = Math.min(
      30,
      Math.max(1, typeof d.limit === "number" ? Math.floor(d.limit) : 20)
    );

    if (!federationSlug) {
      throw new HttpsError("invalid-argument", "federationSlug가 필요합니다.");
    }
    if (!bulk && !notificationId) {
      throw new HttpsError(
        "invalid-argument",
        "notificationId 또는 bulk=true가 필요합니다."
      );
    }

    const db = getFirestore();
    const fedSnap = await db.collection("federations").doc(federationSlug).get();
    if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
    if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown>, uid)) {
      throw new HttpsError("permission-denied", "협회 관리자만 실행할 수 있습니다.");
    }

    let docs;
    if (notificationId) {
      const one = await db.collection("notifications").doc(notificationId).get();
      docs = one.exists ? [one] : [];
    } else {
      const snap = await db
        .collection("notifications")
        .where("status", "==", "sms_failed")
        .where("federationSlug", "==", federationSlug)
        .limit(limitN)
        .get()
        .catch(async () =>
          db.collection("notifications").where("status", "==", "sms_failed").limit(limitN * 3).get()
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
      const slug =
        (typeof raw.federationSlug === "string" && raw.federationSlug) ||
        (raw.payload && typeof raw.payload === "object"
          ? (raw.payload as { federationSlug?: string }).federationSlug
          : "");
      if (slug !== federationSlug) continue;
      if (raw.status !== "sms_failed" && !notificationId) continue;

      const prevRetry =
        typeof raw.retryCount === "number" ? raw.retryCount : 0;
      await doc.ref.update({
        status: "queued_sms_pending",
        deliveryStatus: "retry",
        retryCount: prevRetry + 1,
        errorCode: null,
        errorMessage: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // re-read after requeue
      const fresh = await doc.ref.get();
      const processed = await processOutboundNotificationDoc(db, fresh, {
        actorUid: uid,
      });
      results.push({ ...processed, retryCount: prevRetry + 1 });

      await db.collection(`federations/${federationSlug}/venueAllocationChangeLogs`).add({
        federationId: federationSlug,
        changeType: "OUTBOUND_RETRY",
        notificationId: doc.id,
        retryCount: prevRetry + 1,
        ok: processed.ok,
        createdBy: uid,
        changedByUid: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    logger.info("[retryFailedNotifications] done", {
      federationSlug,
      count: results.length,
      bulk,
    });

    return {
      ok: true,
      processed: results.length,
      results,
    };
  }
);
