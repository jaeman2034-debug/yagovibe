/**
 * PR1 — Idempotent venue reservation create after first ALLOCATED.
 * PR2 — Member payment claim (REQUESTED); never CONFIRMED/FINALIZED.
 * PR3 — Admin payment confirm / unconfirm + finalize / unfinalize.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/services/platformNotificationService";
import {
  venueReservationDetailPath,
  type VenueReservation,
} from "@/lib/federation/venueReservationTypes";

const DEFAULT_BANK_GUIDE =
  "협회가 안내한 지정 계좌로 입금해 주세요. (계좌 정보는 협회 공지·운영 안내를 따릅니다.)";
const DEFAULT_DEADLINE_LABEL = "이용일 기준 전월까지 납부";

export type EnsureVenueReservationInput = {
  federationSlug: string;
  slotAllocationId: string;
  allocatedRequestId: string;
  venueId: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  teamId: string;
  teamName: string;
  createdByUid: string;
  allocatedByUid: string;
  allocationSource?: "REQUEST_SELECTION" | "ADMIN_DIRECT" | null;
  baseAmount?: number;
  lightingAmount?: number;
  totalAmount?: number;
  bankAccountGuide?: string;
};

/** Deterministic short code from slot id — stable across retries. */
export function buildShortReservationCode(slotAllocationId: string, bookingDate: string): string {
  const ym = bookingDate.replace(/-/g, "").slice(2, 6); // YYMM
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

function parseReservation(id: string, raw: Record<string, unknown>): VenueReservation {
  return {
    id,
    reservationId: String(raw.reservationId || id),
    shortReservationCode: String(raw.shortReservationCode || ""),
    federationSlug: String(raw.federationSlug || ""),
    slotAllocationId: String(raw.slotAllocationId || id),
    allocatedRequestId: String(raw.allocatedRequestId || ""),
    venueId: String(raw.venueId || ""),
    venueName: String(raw.venueName || ""),
    bookingDate: String(raw.bookingDate || ""),
    startTime: String(raw.startTime || ""),
    endTime: String(raw.endTime || ""),
    teamId: String(raw.teamId || ""),
    teamName: String(raw.teamName || ""),
    createdByUid: String(raw.createdByUid || ""),
    allocatedByUid: String(raw.allocatedByUid || ""),
    allocationSource:
      raw.allocationSource === "ADMIN_DIRECT" || raw.allocationSource === "REQUEST_SELECTION"
        ? raw.allocationSource
        : null,
    paymentStatus: raw.paymentStatus === "CONFIRMED" ? "CONFIRMED" : "UNCONFIRMED",
    paymentClaimStatus: raw.paymentClaimStatus === "REQUESTED" ? "REQUESTED" : "NONE",
    confirmStatus: raw.confirmStatus === "FINALIZED" ? "FINALIZED" : "PENDING_PAYMENT",
    paymentClaimedByUid:
      raw.paymentClaimedByUid != null ? String(raw.paymentClaimedByUid) : null,
    paymentClaimedAt: raw.paymentClaimedAt,
    paymentClaimDepositedAt:
      raw.paymentClaimDepositedAt != null ? String(raw.paymentClaimDepositedAt) : null,
    paymentConfirmedByUid:
      raw.paymentConfirmedByUid != null ? String(raw.paymentConfirmedByUid) : null,
    paymentConfirmedAt: raw.paymentConfirmedAt,
    paymentUnconfirmedByUid:
      raw.paymentUnconfirmedByUid != null ? String(raw.paymentUnconfirmedByUid) : null,
    paymentUnconfirmedAt: raw.paymentUnconfirmedAt,
    finalizedByUid: raw.finalizedByUid != null ? String(raw.finalizedByUid) : null,
    finalizedAt: raw.finalizedAt,
    unfinalizeReasonCode:
      raw.unfinalizeReasonCode != null ? String(raw.unfinalizeReasonCode) : null,
    unfinalizeReasonText:
      raw.unfinalizeReasonText != null ? String(raw.unfinalizeReasonText) : null,
    baseAmount: typeof raw.baseAmount === "number" ? raw.baseAmount : 0,
    lightingAmount: typeof raw.lightingAmount === "number" ? raw.lightingAmount : 0,
    totalAmount: typeof raw.totalAmount === "number" ? raw.totalAmount : 0,
    bankAccountGuide: String(raw.bankAccountGuide || DEFAULT_BANK_GUIDE),
    paymentDeadlineLabel: String(raw.paymentDeadlineLabel || DEFAULT_DEADLINE_LABEL),
    detailPath: String(raw.detailPath || ""),
    schemaVersion: 1,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    notifyDedupKey: raw.notifyDedupKey != null ? String(raw.notifyDedupKey) : null,
    claimNotifyDedupKey:
      raw.claimNotifyDedupKey != null ? String(raw.claimNotifyDedupKey) : null,
  };
}

export async function getVenueReservation(
  federationSlug: string,
  reservationId: string
): Promise<VenueReservation | null> {
  const ref = doc(db, "federations", federationSlug, "venueReservations", reservationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return parseReservation(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * Idempotent: reservationId === slotAllocationId.
 * Safe to call from client after allocate and from CF trigger.
 */
export async function ensureVenueReservationAfterAllocate(
  input: EnsureVenueReservationInput
): Promise<{ reservation: VenueReservation; created: boolean }> {
  const reservationId = input.slotAllocationId;
  const ref = doc(db, "federations", input.federationSlug, "venueReservations", reservationId);
  const shortReservationCode = buildShortReservationCode(
    input.slotAllocationId,
    input.bookingDate
  );
  const detailPath = venueReservationDetailPath(input.federationSlug, reservationId);
  const notifyDedupKey = `venue_reservation_allocated_${input.federationSlug}_${reservationId}`;

  const payload = {
    schemaVersion: 1 as const,
    reservationId,
    shortReservationCode,
    federationSlug: input.federationSlug,
    slotAllocationId: input.slotAllocationId,
    allocatedRequestId: input.allocatedRequestId,
    venueId: input.venueId,
    venueName: input.venueName || input.venueId,
    bookingDate: input.bookingDate,
    startTime: input.startTime,
    endTime: input.endTime,
    teamId: input.teamId,
    teamName: input.teamName || input.teamId,
    createdByUid: input.createdByUid,
    allocatedByUid: input.allocatedByUid,
    allocationSource: input.allocationSource ?? null,
    paymentStatus: "UNCONFIRMED" as const,
    paymentClaimStatus: "NONE" as const,
    confirmStatus: "PENDING_PAYMENT" as const,
    baseAmount: input.baseAmount ?? 0,
    lightingAmount: input.lightingAmount ?? 0,
    totalAmount: input.totalAmount ?? 0,
    bankAccountGuide: input.bankAccountGuide?.trim() || DEFAULT_BANK_GUIDE,
    paymentDeadlineLabel: DEFAULT_DEADLINE_LABEL,
    detailPath,
    notifyDedupKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const created = await runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) return false;
    tx.set(ref, payload);
    return true;
  });

  if (!created) {
    const existing = await getDoc(ref);
    return {
      reservation: parseReservation(existing.id, existing.data() as Record<string, unknown>),
      created: false,
    };
  }

  // Denormalize onto winner cursor (best-effort)
  try {
    const winnerRef = doc(
      db,
      "federations",
      input.federationSlug,
      "venueSlotAllocations",
      input.slotAllocationId
    );
    await updateDoc(winnerRef, {
      reservationId,
      shortReservationCode,
      confirmStatus: "PENDING_PAYMENT",
      paymentClaimStatus: "NONE",
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[ensureVenueReservationAfterAllocate] winner denorm skipped", e);
  }

  // Append-only audit (best-effort)
  try {
    const logRef = doc(
      collection(db, "federations", input.federationSlug, "venueAllocationChangeLogs")
    );
    await setDoc(logRef, {
      federationId: input.federationSlug,
      changeType: "RESERVATION_CREATED",
      venueId: input.venueId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      slotAllocationId: input.slotAllocationId,
      reservationId,
      shortReservationCode,
      allocatedRequestId: input.allocatedRequestId,
      changedByUid: input.allocatedByUid,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[ensureVenueReservationAfterAllocate] audit log skipped", e);
  }

  // In-app + FCM enqueue (existing pipeline) — only on first create
  if (input.createdByUid) {
    try {
      await createNotification({
        userId: input.createdByUid,
        type: "SYSTEM_NOTICE",
        title: "구장 배정이 완료되었습니다",
        message: `예약번호 ${shortReservationCode} · ${input.venueName || input.venueId} ${input.bookingDate} ${input.startTime}–${input.endTime}`,
        body: `입금 기한: ${DEFAULT_DEADLINE_LABEL}. 예약 상세에서 계좌·금액을 확인하세요.`,
        link: detailPath,
        status: "queued",
        pushDedupKey: notifyDedupKey,
        teamId: input.teamId,
        teamName: input.teamName,
        priority: "high",
        payload: {
          reservationId,
          shortReservationCode,
          federationSlug: input.federationSlug,
        },
      });
    } catch (e) {
      console.warn("[ensureVenueReservationAfterAllocate] notify skipped", e);
    }
  }

  return {
    reservation: parseReservation(reservationId, payload as unknown as Record<string, unknown>),
    created: true,
  };
}

/** Load bank guide from federation doc if present (display only). */
export async function resolveFederationBankAccountGuide(
  federationSlug: string
): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "federations", federationSlug));
    if (!snap.exists()) return DEFAULT_BANK_GUIDE;
    const d = snap.data() as Record<string, unknown>;
    const meta = (d.meta && typeof d.meta === "object" ? d.meta : {}) as Record<string, unknown>;
    const candidates = [
      d.bankAccountGuide,
      d.venueBankAccountGuide,
      meta.bankAccountGuide,
      meta.depositAccount,
      d.bankAccount,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c.trim();
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_BANK_GUIDE;
}

/** Manager uids aligned with firestore.rules isFederationManager fields. */
export async function listFederationManagerUids(federationSlug: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "federations", federationSlug));
  if (!snap.exists()) return [];
  const d = snap.data() as Record<string, unknown>;
  const out = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim()) out.add(v.trim());
  };
  add(d.ownerId);
  add(d.ownerUid);
  for (const key of ["adminUids", "adminIds"] as const) {
    const arr = d[key];
    if (Array.isArray(arr)) arr.forEach(add);
  }
  const roles = d.roles && typeof d.roles === "object" ? (d.roles as Record<string, unknown>) : null;
  if (roles) {
    for (const key of ["admins", "editors"] as const) {
      const arr = roles[key];
      if (Array.isArray(arr)) arr.forEach(add);
    }
  }
  return [...out];
}

export async function listPaymentClaimQueue(
  federationSlug: string
): Promise<VenueReservation[]> {
  // Single-field query — filter UNCONFIRMED client-side (avoid composite index wait)
  const snap = await getDocs(
    query(
      collection(db, "federations", federationSlug, "venueReservations"),
      where("paymentClaimStatus", "==", "REQUESTED")
    )
  );
  return snap.docs
    .map((d) => parseReservation(d.id, d.data() as Record<string, unknown>))
    .filter((r) => r.paymentStatus === "UNCONFIRMED")
    .sort((a, b) => {
      const ta = a.bookingDate + a.startTime;
      const tb = b.bookingDate + b.startTime;
      return ta.localeCompare(tb);
    });
}

export type ClaimVenueReservationInput = {
  federationSlug: string;
  reservationId: string;
  claimantUid: string;
  /** Optional member-reported deposit datetime (local ISO or `YYYY-MM-DDTHH:mm`) */
  depositedAtLocal?: string | null;
};

/**
 * PR2 — Member 「입금 확인 요청」.
 * Sets paymentClaimStatus=REQUESTED (PAYMENT_CLAIMED alias).
 * NEVER sets paymentStatus=CONFIRMED or confirmStatus=FINALIZED.
 */
export async function claimVenueReservationPayment(
  input: ClaimVenueReservationInput
): Promise<{ reservation: VenueReservation; claimed: boolean }> {
  if (!input.claimantUid.trim()) {
    throw new Error("로그인이 필요합니다.");
  }
  const ref = doc(
    db,
    "federations",
    input.federationSlug,
    "venueReservations",
    input.reservationId
  );
  const claimNotifyDedupKey = `venue_payment_claim_${input.federationSlug}_${input.reservationId}`;
  const depositedAt =
    input.depositedAtLocal != null && String(input.depositedAtLocal).trim()
      ? String(input.depositedAtLocal).trim()
      : null;

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("예약을 찾을 수 없습니다.");
    const raw = snap.data() as Record<string, unknown>;
    const paymentStatus = raw.paymentStatus === "CONFIRMED" ? "CONFIRMED" : "UNCONFIRMED";
    const confirmStatus =
      raw.confirmStatus === "FINALIZED" ? "FINALIZED" : "PENDING_PAYMENT";
    const claimStatus = raw.paymentClaimStatus === "REQUESTED" ? "REQUESTED" : "NONE";

    if (paymentStatus === "CONFIRMED") {
      throw new Error("이미 입금 확인된 예약입니다.");
    }
    if (confirmStatus === "FINALIZED") {
      throw new Error("이미 확정된 예약입니다.");
    }

    if (claimStatus === "REQUESTED") {
      return { already: true as const, raw };
    }

    tx.update(ref, {
      paymentClaimStatus: "REQUESTED",
      paymentStatus: "UNCONFIRMED",
      confirmStatus: "PENDING_PAYMENT",
      paymentClaimedByUid: input.claimantUid,
      paymentClaimedAt: serverTimestamp(),
      paymentClaimDepositedAt: depositedAt,
      claimNotifyDedupKey,
      updatedAt: serverTimestamp(),
    });
    return { already: false as const, raw };
  });

  const after = await getDoc(ref);
  const reservation = parseReservation(
    input.reservationId,
    after.data() as Record<string, unknown>
  );

  if (result.already) {
    return { reservation, claimed: false };
  }

  // Denorm onto winner cursor (best-effort; rules allow claim fields)
  try {
    await updateDoc(
      doc(
        db,
        "federations",
        input.federationSlug,
        "venueSlotAllocations",
        input.reservationId
      ),
      {
        paymentClaimStatus: "REQUESTED",
        paymentStatus: "UNCONFIRMED",
        paymentClaimedByUid: input.claimantUid,
        paymentClaimedAt: serverTimestamp(),
        paymentClaimDepositedAt: depositedAt,
        updatedAt: serverTimestamp(),
      }
    );
  } catch (e) {
    console.warn("[claimVenueReservationPayment] winner denorm skipped", e);
  }

  try {
    const logRef = doc(
      collection(db, "federations", input.federationSlug, "venueAllocationChangeLogs")
    );
    await setDoc(logRef, {
      federationId: input.federationSlug,
      changeType: "PAYMENT_CLAIM",
      venueId: reservation.venueId,
      bookingDate: reservation.bookingDate,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      slotAllocationId: reservation.slotAllocationId,
      reservationId: reservation.reservationId,
      shortReservationCode: reservation.shortReservationCode,
      changedByUid: input.claimantUid,
      paymentClaimStatusAfter: "REQUESTED",
      paymentStatusAfter: "UNCONFIRMED",
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[claimVenueReservationPayment] audit log skipped", e);
  }

  try {
    const managers = await listFederationManagerUids(input.federationSlug);
    const targets = managers.filter((uid) => uid !== input.claimantUid);
    await Promise.all(
      targets.map((userId) =>
        createNotification({
          userId,
          type: "SYSTEM_NOTICE",
          title: "입금 확인 요청",
          message: `${reservation.teamName} · ${reservation.venueName} ${reservation.bookingDate} ${reservation.startTime}–${reservation.endTime}`,
          body: `예약번호 ${reservation.shortReservationCode}. 통장 확인 후 입금 완료 처리하세요.`,
          link: reservation.detailPath,
          status: "queued",
          pushDedupKey: `${claimNotifyDedupKey}_${userId}`,
          teamId: reservation.teamId,
          teamName: reservation.teamName,
          priority: "high",
          payload: {
            reservationId: reservation.reservationId,
            shortReservationCode: reservation.shortReservationCode,
            federationSlug: input.federationSlug,
            paymentClaimStatus: "REQUESTED",
          },
        })
      )
    );
  } catch (e) {
    console.warn("[claimVenueReservationPayment] manager notify skipped", e);
  }

  return { reservation, claimed: true };
}

// ─── PR3 — Admin confirm / finalize ─────────────────────────────────────────

type AdminAxisInput = {
  federationSlug: string;
  reservationId: string;
  adminUid: string;
};

async function loadReservationOrThrow(
  federationSlug: string,
  reservationId: string
): Promise<VenueReservation> {
  const r = await getVenueReservation(federationSlug, reservationId);
  if (!r) throw new Error("예약을 찾을 수 없습니다. 배정 후 예약이 생성되어야 합니다.");
  return r;
}

async function appendAdminChangeLog(input: {
  federationSlug: string;
  reservation: VenueReservation;
  changeType:
    | "PAYMENT_CONFIRM"
    | "PAYMENT_UNCONFIRM"
    | "ALLOCATION_FINALIZE"
    | "ALLOCATION_UNFINALIZE";
  adminUid: string;
  reasonCode?: string | null;
  reasonText?: string | null;
  paymentStatusAfter: "UNCONFIRMED" | "CONFIRMED";
  confirmStatusAfter: "PENDING_PAYMENT" | "FINALIZED";
}): Promise<void> {
  const logRef = doc(
    collection(db, "federations", input.federationSlug, "venueAllocationChangeLogs")
  );
  await setDoc(logRef, {
    federationId: input.federationSlug,
    changeType: input.changeType,
    venueId: input.reservation.venueId,
    bookingDate: input.reservation.bookingDate,
    startTime: input.reservation.startTime,
    endTime: input.reservation.endTime,
    slotAllocationId: input.reservation.slotAllocationId,
    reservationId: input.reservation.reservationId,
    shortReservationCode: input.reservation.shortReservationCode,
    changedByUid: input.adminUid,
    reasonCode: input.reasonCode ?? null,
    reasonText: input.reasonText ?? null,
    paymentStatusAfter: input.paymentStatusAfter,
    confirmStatusAfter: input.confirmStatusAfter,
    paymentClaimStatusAfter: input.reservation.paymentClaimStatus,
    createdAt: serverTimestamp(),
  });
}

async function notifyReservationMember(input: {
  reservation: VenueReservation;
  title: string;
  message: string;
  body: string;
  pushDedupKey: string;
}): Promise<void> {
  const uid = input.reservation.createdByUid;
  if (!uid) return;
  await createNotification({
    userId: uid,
    type: "SYSTEM_NOTICE",
    title: input.title,
    message: input.message,
    body: input.body,
    link: input.reservation.detailPath,
    status: "queued",
    pushDedupKey: input.pushDedupKey,
    teamId: input.reservation.teamId,
    teamName: input.reservation.teamName,
    priority: "high",
    payload: {
      reservationId: input.reservation.reservationId,
      shortReservationCode: input.reservation.shortReservationCode,
      federationSlug: input.reservation.federationSlug,
    },
  });
}

async function denormWinnerAndRequest(input: {
  federationSlug: string;
  reservation: VenueReservation;
  patch: Record<string, unknown>;
}): Promise<void> {
  const winnerRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueSlotAllocations",
    input.reservation.slotAllocationId
  );
  try {
    await updateDoc(winnerRef, { ...input.patch, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn("[denormWinnerAndRequest] winner skipped", e);
  }
  if (input.reservation.allocatedRequestId) {
    try {
      await updateDoc(
        doc(
          db,
          "federations",
          input.federationSlug,
          "venueAllocationRequests",
          input.reservation.allocatedRequestId
        ),
        {
          paymentStatus: input.patch.paymentStatus,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (e) {
      console.warn("[denormWinnerAndRequest] request skipped", e);
    }
  }
}

/** PR3 — Admin 「입금 확인」 UNCONFIRMED → CONFIRMED */
export async function confirmVenueReservationPayment(
  input: AdminAxisInput
): Promise<VenueReservation> {
  if (!input.adminUid.trim()) throw new Error("관리자 권한이 필요합니다.");
  const existing = await loadReservationOrThrow(input.federationSlug, input.reservationId);
  if (existing.paymentStatus === "CONFIRMED") return existing;
  if (existing.confirmStatus === "FINALIZED") {
    throw new Error("이미 확정된 예약입니다.");
  }

  const ref = doc(
    db,
    "federations",
    input.federationSlug,
    "venueReservations",
    input.reservationId
  );
  await updateDoc(ref, {
    paymentStatus: "CONFIRMED",
    confirmStatus: "PENDING_PAYMENT",
    paymentConfirmedByUid: input.adminUid,
    paymentConfirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const reservation = await loadReservationOrThrow(input.federationSlug, input.reservationId);
  await denormWinnerAndRequest({
    federationSlug: input.federationSlug,
    reservation,
    patch: {
      paymentStatus: "CONFIRMED",
      confirmStatus: "PENDING_PAYMENT",
      paymentConfirmedByUid: input.adminUid,
      paymentConfirmedAt: serverTimestamp(),
    },
  });

  try {
    await appendAdminChangeLog({
      federationSlug: input.federationSlug,
      reservation,
      changeType: "PAYMENT_CONFIRM",
      adminUid: input.adminUid,
      paymentStatusAfter: "CONFIRMED",
      confirmStatusAfter: "PENDING_PAYMENT",
    });
  } catch (e) {
    console.warn("[confirmVenueReservationPayment] audit skipped", e);
  }

  try {
    await notifyReservationMember({
      reservation,
      title: "입금이 확인되었습니다",
      message: `예약번호 ${reservation.shortReservationCode} · ${reservation.venueName} ${reservation.bookingDate}`,
      body: "협회에서 입금을 확인했습니다. 예약 확정은 별도로 진행됩니다.",
      pushDedupKey: `venue_payment_confirm_${input.federationSlug}_${input.reservationId}`,
    });
  } catch (e) {
    console.warn("[confirmVenueReservationPayment] notify skipped", e);
  }

  return reservation;
}

/** PR3 — Admin 「입금 확인 해제」 CONFIRMED → UNCONFIRMED (FINALIZED면 DENY) */
export async function unconfirmVenueReservationPayment(
  input: AdminAxisInput
): Promise<VenueReservation> {
  if (!input.adminUid.trim()) throw new Error("관리자 권한이 필요합니다.");
  const existing = await loadReservationOrThrow(input.federationSlug, input.reservationId);
  if (existing.confirmStatus === "FINALIZED") {
    throw new Error("확정된 예약은 입금 해제할 수 없습니다. 먼저 확정을 취소하세요.");
  }
  if (existing.paymentStatus === "UNCONFIRMED") return existing;

  const ref = doc(
    db,
    "federations",
    input.federationSlug,
    "venueReservations",
    input.reservationId
  );
  await updateDoc(ref, {
    paymentStatus: "UNCONFIRMED",
    confirmStatus: "PENDING_PAYMENT",
    paymentUnconfirmedByUid: input.adminUid,
    paymentUnconfirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const reservation = await loadReservationOrThrow(input.federationSlug, input.reservationId);
  await denormWinnerAndRequest({
    federationSlug: input.federationSlug,
    reservation,
    patch: {
      paymentStatus: "UNCONFIRMED",
      confirmStatus: "PENDING_PAYMENT",
      paymentUnconfirmedByUid: input.adminUid,
      paymentUnconfirmedAt: serverTimestamp(),
    },
  });

  try {
    await appendAdminChangeLog({
      federationSlug: input.federationSlug,
      reservation,
      changeType: "PAYMENT_UNCONFIRM",
      adminUid: input.adminUid,
      paymentStatusAfter: "UNCONFIRMED",
      confirmStatusAfter: "PENDING_PAYMENT",
    });
  } catch (e) {
    console.warn("[unconfirmVenueReservationPayment] audit skipped", e);
  }

  try {
    await notifyReservationMember({
      reservation,
      title: "입금 확인이 해제되었습니다",
      message: `예약번호 ${reservation.shortReservationCode} · 입금 상태가 미확인으로 변경되었습니다.`,
      body: "협회 안내에 따라 입금·확인 요청을 다시 진행해 주세요.",
      pushDedupKey: `venue_payment_unconfirm_${input.federationSlug}_${input.reservationId}_${Date.now()}`,
    });
  } catch (e) {
    console.warn("[unconfirmVenueReservationPayment] notify skipped", e);
  }

  return reservation;
}

/** PR3 — Admin 「예약 확정」 requires CONFIRMED */
export async function finalizeVenueReservation(
  input: AdminAxisInput
): Promise<VenueReservation> {
  if (!input.adminUid.trim()) throw new Error("관리자 권한이 필요합니다.");
  const existing = await loadReservationOrThrow(input.federationSlug, input.reservationId);
  if (existing.paymentStatus !== "CONFIRMED") {
    throw new Error("입금 확인 후에만 예약을 확정할 수 있습니다.");
  }
  if (existing.confirmStatus === "FINALIZED") return existing;

  const ref = doc(
    db,
    "federations",
    input.federationSlug,
    "venueReservations",
    input.reservationId
  );
  await updateDoc(ref, {
    paymentStatus: "CONFIRMED",
    confirmStatus: "FINALIZED",
    finalizedByUid: input.adminUid,
    finalizedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const reservation = await loadReservationOrThrow(input.federationSlug, input.reservationId);
  await denormWinnerAndRequest({
    federationSlug: input.federationSlug,
    reservation,
    patch: {
      paymentStatus: "CONFIRMED",
      confirmStatus: "FINALIZED",
      finalizedByUid: input.adminUid,
      finalizedAt: serverTimestamp(),
    },
  });

  try {
    await appendAdminChangeLog({
      federationSlug: input.federationSlug,
      reservation,
      changeType: "ALLOCATION_FINALIZE",
      adminUid: input.adminUid,
      paymentStatusAfter: "CONFIRMED",
      confirmStatusAfter: "FINALIZED",
    });
  } catch (e) {
    console.warn("[finalizeVenueReservation] audit skipped", e);
  }

  try {
    await notifyReservationMember({
      reservation,
      title: "예약이 최종 확정되었습니다",
      message: `예약번호 ${reservation.shortReservationCode} · ${reservation.venueName} ${reservation.bookingDate} ${reservation.startTime}–${reservation.endTime}`,
      body: "구장 이용이 확정되었습니다. 예약 상세에서 확인해 주세요.",
      pushDedupKey: `venue_reservation_finalize_${input.federationSlug}_${input.reservationId}`,
    });
  } catch (e) {
    console.warn("[finalizeVenueReservation] notify skipped", e);
  }

  return reservation;
}

/** PR3 — Admin 「확정 취소」 + reason (payment stays CONFIRMED) */
export async function unfinalizeVenueReservation(input: {
  federationSlug: string;
  reservationId: string;
  adminUid: string;
  reasonCode: string;
  reasonText?: string | null;
}): Promise<VenueReservation> {
  if (!input.adminUid.trim()) throw new Error("관리자 권한이 필요합니다.");
  const text = input.reasonText != null ? String(input.reasonText).trim() : "";
  if (!input.reasonCode.trim()) throw new Error("확정 취소 사유를 선택하세요.");
  if (input.reasonCode === "OTHER" && !text) {
    throw new Error("기타 사유를 입력하세요.");
  }

  const existing = await loadReservationOrThrow(input.federationSlug, input.reservationId);
  if (existing.confirmStatus !== "FINALIZED") return existing;

  const ref = doc(
    db,
    "federations",
    input.federationSlug,
    "venueReservations",
    input.reservationId
  );
  await updateDoc(ref, {
    paymentStatus: "CONFIRMED",
    confirmStatus: "PENDING_PAYMENT",
    unfinalizeReasonCode: input.reasonCode,
    unfinalizeReasonText: text || null,
    updatedAt: serverTimestamp(),
  });

  const reservation = await loadReservationOrThrow(input.federationSlug, input.reservationId);
  await denormWinnerAndRequest({
    federationSlug: input.federationSlug,
    reservation,
    patch: {
      paymentStatus: "CONFIRMED",
      confirmStatus: "PENDING_PAYMENT",
      unfinalizeReasonCode: input.reasonCode,
      unfinalizeReasonText: text || null,
    },
  });

  try {
    await appendAdminChangeLog({
      federationSlug: input.federationSlug,
      reservation,
      changeType: "ALLOCATION_UNFINALIZE",
      adminUid: input.adminUid,
      reasonCode: input.reasonCode,
      reasonText: text || null,
      paymentStatusAfter: "CONFIRMED",
      confirmStatusAfter: "PENDING_PAYMENT",
    });
  } catch (e) {
    console.warn("[unfinalizeVenueReservation] audit skipped", e);
  }

  try {
    await notifyReservationMember({
      reservation,
      title: "예약 확정이 취소되었습니다",
      message: `예약번호 ${reservation.shortReservationCode} · 확정이 해제되었습니다.`,
      body: text ? `사유: ${text}` : "협회 안내에 따라 확인해 주세요.",
      pushDedupKey: `venue_reservation_unfinalize_${input.federationSlug}_${input.reservationId}_${Date.now()}`,
    });
  } catch (e) {
    console.warn("[unfinalizeVenueReservation] notify skipped", e);
  }

  return reservation;
}
