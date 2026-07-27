/**
 * PR1 — When venueSlotAllocations first becomes ALLOCATED,
 * ensure venueReservations/{slotId} + enqueue in-app notification (FCM via status=queued).
 * Idempotent. No claim / confirm / Kakao.
 */
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

const DEFAULT_BANK_GUIDE =
  "협회가 안내한 지정 계좌로 입금해 주세요. (계좌 정보는 협회 공지·운영 안내를 따릅니다.)";
const DEFAULT_DEADLINE_LABEL = "이용일 기준 전월까지 납부";

function buildShortReservationCode(slotAllocationId: string, bookingDate: string): string {
  const ym = bookingDate.replace(/-/g, "").slice(2, 6);
  let h = 0;
  for (let i = 0; i < slotAllocationId.length; i++) {
    h = (h * 31 + slotAllocationId.charCodeAt(i)) >>> 0;
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let n = h;
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix = alphabet[n % alphabet.length] + suffix;
    n = Math.floor(n / alphabet.length);
  }
  return `NW-${ym}-${suffix}`;
}

function isFirstAllocated(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): boolean {
  if (!after || String(after.status || "") !== "ALLOCATED") return false;
  if (!before || before.status == null) return true;
  return String(before.status) !== "ALLOCATED";
}

async function resolveBankGuide(fedSlug: string): Promise<string> {
  try {
    const snap = await admin.firestore().doc(`federations/${fedSlug}`).get();
    if (!snap.exists) return DEFAULT_BANK_GUIDE;
    const d = snap.data() as Record<string, unknown>;
    const meta = (d.meta && typeof d.meta === "object" ? d.meta : {}) as Record<string, unknown>;
    for (const c of [
      d.bankAccountGuide,
      d.venueBankAccountGuide,
      meta.bankAccountGuide,
      meta.depositAccount,
      d.bankAccount,
    ]) {
      if (typeof c === "string" && c.trim()) return c.trim();
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_BANK_GUIDE;
}

export const onVenueSlotAllocationWritten = onDocumentWritten(
  {
    document: "federations/{fedSlug}/venueSlotAllocations/{slotId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const fedSlug = String(event.params.fedSlug || "");
    const slotId = String(event.params.slotId || "");
    const before = event.data?.before.exists
      ? (event.data.before.data() as Record<string, unknown>)
      : undefined;
    const after = event.data?.after.exists
      ? (event.data.after.data() as Record<string, unknown>)
      : undefined;
    if (!fedSlug || !slotId || !isFirstAllocated(before, after) || !after) return;

    const db = admin.firestore();
    const reservationId = slotId;
    const resRef = db.doc(`federations/${fedSlug}/venueReservations/${reservationId}`);

    const bookingDate = String(after.bookingDate || "");
    const startTime = String(after.startTime || "");
    const endTime = String(after.endTime || "");
    const venueId = String(after.venueId || "");
    const teamId = String(after.allocatedTeamId || "");
    const teamName =
      after.allocatedTeamName != null ? String(after.allocatedTeamName) : teamId;
    const allocatedRequestId = String(after.allocatedRequestId || "");
    const allocatedByUid = String(after.allocatedByUid || "");
    const allocationSource =
      after.allocationSource === "ADMIN_DIRECT" || after.allocationSource === "REQUEST_SELECTION"
        ? after.allocationSource
        : null;

    let createdByUid = "";
    let venueName = venueId;
    let baseAmount = 0;
    let lightingAmount = 0;
    let totalAmount = 0;
    if (allocatedRequestId) {
      try {
        const req = await db
          .doc(`federations/${fedSlug}/venueAllocationRequests/${allocatedRequestId}`)
          .get();
        if (req.exists) {
          const r = req.data() as Record<string, unknown>;
          createdByUid = String(r.createdByUid || "");
          if (typeof r.venueName === "string" && r.venueName.trim()) venueName = r.venueName.trim();
          if (typeof r.baseAmount === "number") baseAmount = r.baseAmount;
          if (typeof r.lightingAmount === "number") lightingAmount = r.lightingAmount;
          if (typeof r.totalAmount === "number") totalAmount = r.totalAmount;
        }
      } catch (e) {
        logger.warn("[onVenueSlotAllocationWritten] request load failed", { e: String(e) });
      }
    }

    const shortReservationCode = buildShortReservationCode(slotId, bookingDate);
    const detailPath = `/federations/${encodeURIComponent(fedSlug)}/reservations/${encodeURIComponent(reservationId)}`;
    const notifyDedupKey = `venue_reservation_allocated_${fedSlug}_${reservationId}`;
    const bankAccountGuide = await resolveBankGuide(fedSlug);
    const now = admin.firestore.FieldValue.serverTimestamp();

    let created = false;
    try {
      created = await db.runTransaction(async (tx) => {
        const snap = await tx.get(resRef);
        if (snap.exists) return false;
        tx.set(resRef, {
          schemaVersion: 1,
          reservationId,
          shortReservationCode,
          federationSlug: fedSlug,
          slotAllocationId: slotId,
          allocatedRequestId,
          venueId,
          venueName,
          bookingDate,
          startTime,
          endTime,
          teamId,
          teamName,
          createdByUid,
          allocatedByUid,
          allocationSource,
          paymentStatus: "UNCONFIRMED",
          paymentClaimStatus: "NONE",
          confirmStatus: "PENDING_PAYMENT",
          baseAmount,
          lightingAmount,
          totalAmount,
          bankAccountGuide,
          paymentDeadlineLabel: DEFAULT_DEADLINE_LABEL,
          detailPath,
          notifyDedupKey,
          createdAt: now,
          updatedAt: now,
        });
        return true;
      });
    } catch (e) {
      logger.error("[onVenueSlotAllocationWritten] reservation txn failed", {
        fedSlug,
        slotId,
        error: String(e),
      });
      return;
    }

    if (!created) {
      logger.info("[onVenueSlotAllocationWritten] idempotent skip", { fedSlug, slotId });
      return;
    }

    try {
      await db.doc(`federations/${fedSlug}/venueSlotAllocations/${slotId}`).update({
        reservationId,
        shortReservationCode,
        confirmStatus: "PENDING_PAYMENT",
        paymentClaimStatus: "NONE",
        updatedAt: now,
      });
    } catch (e) {
      logger.warn("[onVenueSlotAllocationWritten] winner denorm skipped", { e: String(e) });
    }

    try {
      await db.collection(`federations/${fedSlug}/venueAllocationChangeLogs`).add({
        federationId: fedSlug,
        changeType: "RESERVATION_CREATED",
        venueId,
        bookingDate,
        startTime,
        endTime,
        slotAllocationId: slotId,
        reservationId,
        shortReservationCode,
        allocatedRequestId,
        changedByUid: allocatedByUid || "system",
        createdAt: now,
      });
    } catch (e) {
      logger.warn("[onVenueSlotAllocationWritten] audit log skipped", { e: String(e) });
    }

    const notifyUid = createdByUid || allocatedByUid;
    if (notifyUid) {
      try {
        await db.collection("notifications").add({
          userId: notifyUid,
          type: "SYSTEM_NOTICE",
          title: "구장 배정이 완료되었습니다",
          message: `예약번호 ${shortReservationCode} · ${venueName} ${bookingDate} ${startTime}–${endTime}`,
          body: `입금 기한: ${DEFAULT_DEADLINE_LABEL}. 예약 상세에서 계좌·금액을 확인하세요.`,
          link: detailPath,
          status: "queued",
          pushDedupKey: notifyDedupKey,
          teamId,
          teamName,
          priority: "high",
          payload: { reservationId, shortReservationCode, federationSlug: fedSlug },
          isRead: false,
          createdAt: now,
        });
      } catch (e) {
        logger.warn("[onVenueSlotAllocationWritten] notify skipped", { e: String(e) });
      }
    }

    logger.info("[onVenueSlotAllocationWritten] reservation created", {
      fedSlug,
      slotId,
      shortReservationCode,
    });
  }
);
