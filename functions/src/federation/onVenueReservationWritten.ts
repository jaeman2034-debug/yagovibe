/**
 * PR3 Notification Hot Fix — venueReservations 축 전이 시 멤버 알림 (Admin SDK).
 * Client createNotification 실패와 무관하게 Confirm / Finalize 문서를 보장한다.
 * Idempotent via pushDedupKey.
 */
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

async function notifyOnce(input: {
  userId: string;
  title: string;
  message: string;
  body: string;
  link: string;
  pushDedupKey: string;
  teamId: string;
  teamName: string;
  payload: Record<string, string>;
}): Promise<void> {
  const db = admin.firestore();
  const existing = await db
    .collection("notifications")
    .where("pushDedupKey", "==", input.pushDedupKey)
    .limit(1)
    .get();
  if (!existing.empty) {
    logger.info("[onVenueReservationWritten] notify dedup skip", {
      pushDedupKey: input.pushDedupKey,
    });
    return;
  }

  await db.collection("notifications").add({
    userId: input.userId,
    type: "SYSTEM_NOTICE",
    title: input.title,
    message: input.message,
    body: input.body,
    link: input.link,
    status: "queued",
    pushDedupKey: input.pushDedupKey,
    teamId: input.teamId,
    teamName: input.teamName,
    priority: "high",
    payload: input.payload,
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export const onVenueReservationWritten = onDocumentWritten(
  {
    document: "federations/{fedSlug}/venueReservations/{reservationId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const after = event.data?.after?.data() as Record<string, unknown> | undefined;
    if (!after) return;

    const fedSlug = String(event.params.fedSlug || "");
    const reservationId = String(event.params.reservationId || "");
    const userId = String(after.createdByUid || "").trim();
    if (!fedSlug || !reservationId || !userId) return;

    const detailPath =
      typeof after.detailPath === "string" && after.detailPath.startsWith("/")
        ? after.detailPath
        : `/federations/${fedSlug}/reservations/${reservationId}`;
    const shortCode = String(after.shortReservationCode || "");
    const venueName = String(after.venueName || after.venueId || "");
    const bookingDate = String(after.bookingDate || "");
    const startTime = String(after.startTime || "");
    const endTime = String(after.endTime || "");
    const teamId = String(after.teamId || "");
    const teamName = String(after.teamName || "");
    const payload = {
      reservationId,
      shortReservationCode: shortCode,
      federationSlug: fedSlug,
    };

    const prevPay = before ? String(before.paymentStatus || "") : "";
    const nextPay = String(after.paymentStatus || "");
    const prevConfirm = before ? String(before.confirmStatus || "") : "";
    const nextConfirm = String(after.confirmStatus || "");

    // UNCONFIRMED → CONFIRMED (입금 확인)
    if (nextPay === "CONFIRMED" && prevPay !== "CONFIRMED") {
      try {
        await notifyOnce({
          userId,
          title: "입금이 확인되었습니다",
          message: `예약번호 ${shortCode} · ${venueName} ${bookingDate}`,
          body: "협회에서 입금을 확인했습니다. 예약 확정은 별도로 진행됩니다.",
          link: detailPath,
          pushDedupKey: `venue_payment_confirm_${fedSlug}_${reservationId}`,
          teamId,
          teamName,
          payload,
        });
      } catch (e) {
        logger.warn("[onVenueReservationWritten] confirm notify skipped", { e: String(e) });
      }
    }

    // PENDING_PAYMENT → FINALIZED (예약 확정)
    if (nextConfirm === "FINALIZED" && prevConfirm !== "FINALIZED") {
      try {
        await notifyOnce({
          userId,
          title: "예약이 최종 확정되었습니다",
          message: `예약번호 ${shortCode} · ${venueName} ${bookingDate} ${startTime}–${endTime}`,
          body: "구장 이용이 확정되었습니다. 예약 상세에서 확인해 주세요.",
          link: detailPath,
          pushDedupKey: `venue_reservation_finalize_${fedSlug}_${reservationId}`,
          teamId,
          teamName,
          payload,
        });
      } catch (e) {
        logger.warn("[onVenueReservationWritten] finalize notify skipped", { e: String(e) });
      }
    }
  }
);
