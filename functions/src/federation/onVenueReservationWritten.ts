/**
 * PR3/PR4 Sprint C — venueReservations 축 전이 시 멤버 알림 + AlimTalk outbound queue.
 * Confirm / Finalize in-app + phone → queued_sms_pending (auto AlimTalk when Live).
 */
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { resolveTeamContactsNotifyAdmin } from "../lib/resolveTeamContactsNotify";

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

async function enqueueOutboundAlimTalk(input: {
  fedSlug: string;
  reservationId: string;
  teamId: string;
  teamName: string;
  teamKind: "platform" | "guest" | null;
  guestTeamId: string | null;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  shortCode: string;
  detailPath: string;
  templateKey: "PAYMENT_APPROVED" | "RESERVATION_CONFIRMED";
  alimTalkTemplateId: "PAYMENT_CONFIRMED";
  title: string;
  message: string;
  body: string;
  createdByUid: string;
}): Promise<void> {
  const db = admin.firestore();
  const resolved = await resolveTeamContactsNotifyAdmin(
    db,
    input.guestTeamId || input.teamId,
    [input.createdByUid],
    input.fedSlug,
    input.teamKind
  );
  const notifyable = resolved.targets.filter((t) => Boolean(t.phone));
  if (notifyable.length === 0) {
    logger.info("[onVenueReservationWritten] no phone for outbound", {
      reservationId: input.reservationId,
      templateKey: input.templateKey,
    });
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const target of notifyable) {
    const notifId = `${input.fedSlug}_${input.templateKey}_${input.reservationId}_${target.role}`.replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );
    const ref = db.collection("notifications").doc(notifId);
    const existing = await ref.get();
    if (existing.exists) continue;

    await ref.set({
      userId: target.uid || `phone:${target.phone}`,
      recipientUid: target.uid || null,
      recipientPhone: target.phone || null,
      recipientRole: target.role,
      type: "SYSTEM_NOTICE",
      notificationType: input.templateKey,
      templateKey: input.templateKey,
      alimTalkTemplateId: input.alimTalkTemplateId,
      title: input.title,
      message: input.message,
      body: input.body,
      link: input.detailPath,
      status: "queued_sms_pending",
      deliveryStatus: "queued",
      pushDedupKey: `outbound_${input.templateKey}_${input.fedSlug}_${input.reservationId}_${target.role}`,
      teamId: input.teamId,
      teamName: input.teamName,
      teamKind: input.teamKind,
      guestTeamId: input.guestTeamId,
      federationSlug: input.fedSlug,
      provider: null,
      providerMessageId: null,
      retryCount: 0,
      success: null,
      priority: "high",
      payload: {
        reservationId: input.reservationId,
        shortReservationCode: input.shortCode,
        federationSlug: input.fedSlug,
        templateKey: input.templateKey,
        venueName: input.venueName,
        bookingDate: input.bookingDate,
        startTime: input.startTime,
        endTime: input.endTime,
        time: `${input.startTime}~${input.endTime}`,
        reservationUrl: input.detailPath,
        recipientRole: target.role,
        recipientUid: target.uid || null,
        recipientPhone: target.phone || null,
      },
      isRead: false,
      createdAt: now,
    });
  }
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
    const teamKind =
      after.teamKind === "guest" || after.teamKind === "platform"
        ? after.teamKind
        : null;
    const guestTeamId =
      typeof after.guestTeamId === "string" ? after.guestTeamId : null;
    const payload = {
      reservationId,
      shortReservationCode: shortCode,
      federationSlug: fedSlug,
    };

    const prevPay = before ? String(before.paymentStatus || "") : "";
    const nextPay = String(after.paymentStatus || "");
    const prevConfirm = before ? String(before.confirmStatus || "") : "";
    const nextConfirm = String(after.confirmStatus || "");

    // UNCONFIRMED → CONFIRMED (입금 확인) — in-app + AlimTalk PAYMENT_CONFIRMED
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
      try {
        await enqueueOutboundAlimTalk({
          fedSlug,
          reservationId,
          teamId,
          teamName,
          teamKind,
          guestTeamId,
          venueName,
          bookingDate,
          startTime,
          endTime,
          shortCode,
          detailPath,
          templateKey: "PAYMENT_APPROVED",
          alimTalkTemplateId: "PAYMENT_CONFIRMED",
          title: "입금 확인",
          message: `예약번호 ${shortCode} · 입금이 확인되었습니다`,
          body: "입금이 확인되었습니다. 예약이 최종 확정되었습니다.",
          createdByUid: userId,
        });
      } catch (e) {
        logger.warn("[onVenueReservationWritten] payment alimtalk enqueue skipped", {
          e: String(e),
        });
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
