/**
 * PR1 / PR4-2 — When venueSlotAllocations first becomes ALLOCATED:
 * 1) ensure venueReservations/{slotId} (idempotent by reservation doc)
 * 2) enqueue RESERVATION_ASSIGNED notifications (CF-owned; guest + platform)
 *    — uid → status=queued (App Push)
 *    — phone-only → status=queued_sms_pending (SMS stub)
 * Notification idempotency is per recipientRole (deterministic doc id).
 */
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { resolveTeamContactsNotifyAdmin } from "../lib/resolveTeamContactsNotify";

if (!admin.apps.length) {
  admin.initializeApp();
}

const DEFAULT_BANK_GUIDE =
  "협회가 안내한 지정 계좌로 입금해 주세요. (계좌 정보는 협회 공지·운영 안내를 따릅니다.)";
const NOWON_FEDERATION_DEPOSIT_GUIDE = "국민은행\n536201-01-485137\n노원구축구협회";
const NOWON_SURAKSAN_DEPOSIT_GUIDE = "국민은행\n278501-04-116237\n수락산구장 전용";
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

function assignedNotifyDocId(fedSlug: string, reservationId: string, role: string): string {
  // Deterministic — role-level idempotency for RESERVATION_ASSIGNED
  const raw = `vra_${fedSlug}_${reservationId}_${role}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 700);
}

async function resolveBankGuide(
  fedSlug: string,
  venueId: string,
  venueName: string
): Promise<string> {
  try {
    if (venueId) {
      const venueSnap = await admin.firestore().doc(`federations/${fedSlug}/venues/${venueId}`).get();
      if (venueSnap.exists) {
        const vd = venueSnap.data() as Record<string, unknown>;
        if (typeof vd.depositAccountGuide === "string" && vd.depositAccountGuide.trim()) {
          return vd.depositAccountGuide.trim();
        }
        if (!venueName && typeof vd.name === "string") venueName = vd.name;
      }
    }
  } catch {
    /* ignore */
  }

  if (fedSlug === "nowon-football") {
    const id = venueId.toLowerCase();
    if (id.includes("suraksan") || venueName.includes("수락산")) {
      return NOWON_SURAKSAN_DEPOSIT_GUIDE;
    }
  }

  try {
    const snap = await admin.firestore().doc(`federations/${fedSlug}`).get();
    if (snap.exists) {
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
    }
  } catch {
    /* ignore */
  }

  if (fedSlug === "nowon-football") return NOWON_FEDERATION_DEPOSIT_GUIDE;
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
    let teamName =
      after.allocatedTeamName != null ? String(after.allocatedTeamName) : teamId;
    const teamKind =
      after.teamKind === "guest" || after.teamKind === "platform"
        ? after.teamKind
        : after.guestTeamId
          ? "guest"
          : "platform";
    const guestTeamId =
      typeof after.guestTeamId === "string" && after.guestTeamId.trim()
        ? after.guestTeamId.trim()
        : teamKind === "guest"
          ? teamId
          : "";
    const platformTeamId =
      typeof after.platformTeamId === "string" && after.platformTeamId.trim()
        ? after.platformTeamId.trim()
        : teamKind === "platform"
          ? teamId
          : "";
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

    let shortReservationCode = buildShortReservationCode(slotId, bookingDate);
    const detailPath = `/federations/${encodeURIComponent(fedSlug)}/reservations/${encodeURIComponent(reservationId)}`;
    const notifyDedupKey = `venue_reservation_allocated_${fedSlug}_${reservationId}`;
    let bankAccountGuide = await resolveBankGuide(fedSlug, venueId, venueName);
    const now = admin.firestore.FieldValue.serverTimestamp();

    let reservationCreated = false;
    try {
      reservationCreated = await db.runTransaction(async (tx) => {
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
          teamKind,
          guestTeamId: guestTeamId || null,
          platformTeamId: platformTeamId || null,
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

    // If client already created reservation, reuse snapshot fields for notify body.
    if (!reservationCreated) {
      logger.info("[onVenueSlotAllocationWritten] reservation already exists — notify only", {
        fedSlug,
        slotId,
      });
      try {
        const existing = await resRef.get();
        if (existing.exists) {
          const r = existing.data() as Record<string, unknown>;
          if (typeof r.shortReservationCode === "string" && r.shortReservationCode.trim()) {
            shortReservationCode = r.shortReservationCode.trim();
          }
          if (typeof r.bankAccountGuide === "string" && r.bankAccountGuide.trim()) {
            bankAccountGuide = r.bankAccountGuide.trim();
          }
          if (typeof r.venueName === "string" && r.venueName.trim()) {
            venueName = r.venueName.trim();
          }
          if (typeof r.teamName === "string" && r.teamName.trim()) {
            teamName = r.teamName.trim();
          }
          if (typeof r.totalAmount === "number") totalAmount = r.totalAmount;
          if (typeof r.baseAmount === "number") baseAmount = r.baseAmount;
          if (typeof r.lightingAmount === "number") lightingAmount = r.lightingAmount;
          if (!createdByUid && typeof r.createdByUid === "string") {
            createdByUid = r.createdByUid;
          }
        }
      } catch (e) {
        logger.warn("[onVenueSlotAllocationWritten] existing reservation load failed", {
          e: String(e),
        });
      }
    }

    if (reservationCreated) {
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
          teamId,
          createdBy: allocatedByUid || "system",
          changedByUid: allocatedByUid || "system",
          previousStatus: null,
          newStatus: "ALLOCATED",
          createdAt: now,
        });
      } catch (e) {
        logger.warn("[onVenueSlotAllocationWritten] audit log skipped", { e: String(e) });
      }
    }

    // PR4-2 — CF-owned RESERVATION_ASSIGNED pipeline (guest + platform)
    const resolved = await resolveTeamContactsNotifyAdmin(
      db,
      guestTeamId || teamId,
      [createdByUid],
      fedSlug,
      teamKind
    );

    try {
      await resRef.update({
        notifyTargetSource: resolved.source,
        notifyRecipientRoles: resolved.targets.map((t) => t.role),
        notifyRecipientUids: resolved.targets.map((t) => t.uid).filter(Boolean),
        notifyRecipientPhones: resolved.targets.map((t) => t.phone).filter(Boolean),
        teamKind,
        guestTeamId: guestTeamId || null,
        platformTeamId: platformTeamId || null,
        updatedAt: now,
      });
    } catch (e) {
      logger.warn("[onVenueSlotAllocationWritten] contact denorm skipped", { e: String(e) });
    }

    const notifyable = resolved.targets.filter((t) => Boolean(t.uid || t.phone));
    if (notifyable.length === 0) {
      logger.warn("[onVenueSlotAllocationWritten] no notify target", {
        fedSlug,
        slotId,
        teamId,
        teamKind,
        source: resolved.source,
        resolvedCount: resolved.targets.length,
      });
      return;
    }

    const amountLabel =
      Number.isFinite(totalAmount) && totalAmount > 0
        ? `${Number(totalAmount).toLocaleString("ko-KR")}원`
        : "협회 안내";
    const body = [
      "[노원구축구협회]",
      "",
      `${teamName} 구장 예약이 배정되었습니다.`,
      "",
      "구장",
      venueName,
      "",
      "날짜",
      bookingDate,
      "",
      "시간",
      `${startTime}~${endTime}`,
      "",
      "사용료",
      amountLabel,
      "",
      "입금계좌",
      bankAccountGuide,
      "",
      "예약번호",
      shortReservationCode,
      "",
      "입금 후",
      "",
      "야고 앱에서",
      "",
      "[입금 완료]",
      "",
      "버튼을 눌러",
      "",
      "영수증을 등록해 주세요.",
    ].join("\n");

    let createdNotifyCount = 0;
    let skippedNotifyCount = 0;

    for (const target of notifyable) {
      try {
        const recipientKey =
          target.uid ||
          (target.phone ? `phone:${target.phone}` : `role:${target.role}`);
        const notifId = assignedNotifyDocId(fedSlug, reservationId, target.role);
        const notifRef = db.collection("notifications").doc(notifId);
        const existingNotif = await notifRef.get();
        if (existingNotif.exists) {
          skippedNotifyCount += 1;
          continue;
        }

        // Sprint C: phone → outbound queue (AlimTalk/SMS auto when Live). uid-only → in-app.
        const outboundStatus = target.phone
          ? "queued_sms_pending"
          : target.uid
            ? "queued"
            : "queued_sms_pending";
        await notifRef.set({
          userId: target.uid || recipientKey,
          recipientUid: target.uid || null,
          recipientPhone: target.phone || null,
          recipientRole: target.role,
          type: "SYSTEM_NOTICE",
          notificationType: "RESERVATION_ASSIGNED",
          templateKey: "RESERVATION_ASSIGNED",
          alimTalkTemplateId: "RESERVATION_APPROVED",
          title: "예약 배정 안내",
          message: `${teamName} · ${venueName} · ${bookingDate} ${startTime}~${endTime}`,
          body,
          link: detailPath,
          status: outboundStatus,
          deliveryStatus: outboundStatus === "queued_sms_pending" ? "queued" : null,
          pushDedupKey: `${notifyDedupKey}_${target.role}`,
          teamId,
          teamName,
          teamKind,
          guestTeamId: guestTeamId || null,
          federationSlug: fedSlug,
          provider: null,
          providerMessageId: null,
          retryCount: 0,
          success: null,
          priority: "high",
          payload: {
            reservationId,
            shortReservationCode,
            federationSlug: fedSlug,
            templateKey: "RESERVATION_ASSIGNED",
            venueName,
            bookingDate,
            startTime,
            endTime,
            time: `${startTime}~${endTime}`,
            price: amountLabel,
            deadline: "이용일 전월 안내",
            reservationUrl: detailPath,
            reservationNo: shortReservationCode,
            recipientRole: target.role,
            recipientUid: target.uid || null,
            recipientPhone: target.phone || null,
            notifyTargetSource: resolved.source,
            teamKind,
          },
          isRead: false,
          createdAt: now,
        });
        createdNotifyCount += 1;

        await db.collection(`federations/${fedSlug}/venueAllocationChangeLogs`).add({
          federationId: fedSlug,
          changeType: "RESERVATION_ASSIGNED_NOTIFY",
          notificationType: "RESERVATION_ASSIGNED",
          notificationId: notifId,
          venueId,
          bookingDate,
          startTime,
          endTime,
          slotAllocationId: slotId,
          reservationId,
          teamId,
          teamKind,
          guestTeamId: guestTeamId || null,
          shortReservationCode,
          recipientUid: target.uid || null,
          recipientPhone: target.phone || null,
          recipientRole: target.role,
          createdBy: allocatedByUid || "system",
          changedByUid: allocatedByUid || "system",
          createdAt: now,
        });
      } catch (e) {
        logger.warn("[onVenueSlotAllocationWritten] notify one skipped", {
          e: String(e),
          role: target.role,
          uid: target.uid,
          phone: target.phone ? "set" : "",
        });
      }
    }

    logger.info("[onVenueSlotAllocationWritten] done", {
      fedSlug,
      slotId,
      shortReservationCode,
      reservationCreated,
      teamKind,
      notifyCreated: createdNotifyCount,
      notifySkipped: skippedNotifyCount,
    });
  }
);
