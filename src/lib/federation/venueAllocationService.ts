/**
 * Nowon Federation — multi-club venue allocation requests + one-winner allocate.
 * Board UI occupancy derivation. Production write of this model = local until PM deploy GO.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  assertAllocationReason,
  type AdminCalendarDaySummary,
  type AdminMonthlyBoardRow,
  type AllocationSlotUiStatus,
  type VenueAllocationChangeLog,
  type VenueAllocationChangeReasonCode,
  type VenueAllocationRequest,
  type VenueAllocationRequestStatus,
  type VenueAllocationSource,
  type VenueSlotAllocation,
  formatAllocationSlotLabel,
} from "@/lib/federation/venueAllocationTypes";
import {
  DEFAULT_DAY_SLOT_END,
  DEFAULT_DAY_SLOT_START,
  VENUE_SLOT_INTERVAL_MINUTES,
  type VenueBaselineAllocation,
  type VenueBooking,
} from "@/lib/federation/venueRentalTypes";
import {
  buildTwoHourSlots,
  venueBaselineAllocationDocId,
  venueSlotBookingDocId,
} from "@/lib/federation/venueRentalService";

function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/** One active request per club per venue+date+slot */
export function venueAllocationRequestDocId(
  venueId: string,
  bookingDate: string,
  startTime: string,
  teamId: string
): string {
  const start = startTime.replace(":", "");
  // teamId must match firestore.rules concatenation (no client-only sanitization)
  return `req_${venueId}_${bookingDate}_${start}_${teamId}`;
}

/** One-winner cursor — same shape as Sprint 1 slot id */
export function venueSlotAllocationDocId(
  venueId: string,
  bookingDate: string,
  startTime: string
): string {
  return venueSlotBookingDocId(venueId, bookingDate, startTime);
}

function parseAllocationRequest(
  id: string,
  raw: Record<string, unknown>
): VenueAllocationRequest {
  const st = String(raw.requestStatus || "REQUESTED") as VenueAllocationRequestStatus;
  return {
    id,
    federationId: String(raw.federationId || ""),
    venueId: String(raw.venueId || ""),
    venueName: raw.venueName != null ? String(raw.venueName) : undefined,
    bookingDate: String(raw.bookingDate || ""),
    startTime: String(raw.startTime || ""),
    endTime: String(raw.endTime || ""),
    teamId: String(raw.teamId || ""),
    teamName: raw.teamName != null ? String(raw.teamName) : undefined,
    createdByUid: String(raw.createdByUid || ""),
    requestStatus: st,
    allocationSource:
      raw.allocationSource === "REQUEST_SELECTION" || raw.allocationSource === "ADMIN_DIRECT"
        ? raw.allocationSource
        : null,
    paymentStatus: raw.paymentStatus === "CONFIRMED" ? "CONFIRMED" : "UNCONFIRMED",
    pricingStatus:
      raw.pricingStatus === "QUOTED" || raw.pricingStatus === "REVIEW_REQUIRED"
        ? raw.pricingStatus
        : undefined,
    pricingPolicyId: raw.pricingPolicyId != null ? String(raw.pricingPolicyId) : null,
    pricingSnapshot: raw.pricingSnapshot ?? null,
    baseAmount: typeof raw.baseAmount === "number" ? raw.baseAmount : 0,
    lightingAmount: typeof raw.lightingAmount === "number" ? raw.lightingAmount : 0,
    totalAmount: typeof raw.totalAmount === "number" ? raw.totalAmount : 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    allocatedByUid: raw.allocatedByUid != null ? String(raw.allocatedByUid) : undefined,
    allocatedAt: raw.allocatedAt,
    withdrewAt: raw.withdrewAt,
  };
}

function parseSlotAllocation(id: string, raw: Record<string, unknown>): VenueSlotAllocation {
  const source: VenueAllocationSource =
    raw.allocationSource === "ADMIN_DIRECT" ? "ADMIN_DIRECT" : "REQUEST_SELECTION";
  const status = raw.status === "CANCELLED" ? "CANCELLED" : "ALLOCATED";
  return {
    id,
    federationId: String(raw.federationId || ""),
    venueId: String(raw.venueId || ""),
    bookingDate: String(raw.bookingDate || ""),
    startTime: String(raw.startTime || ""),
    endTime: String(raw.endTime || ""),
    allocatedTeamId: String(raw.allocatedTeamId || ""),
    allocatedTeamName:
      raw.allocatedTeamName != null ? String(raw.allocatedTeamName) : undefined,
    allocatedRequestId: String(raw.allocatedRequestId || ""),
    allocatedByUid: String(raw.allocatedByUid || ""),
    allocatedAt: raw.allocatedAt,
    allocationSource: source,
    status,
    cancelledByUid: raw.cancelledByUid != null ? String(raw.cancelledByUid) : undefined,
    cancelledAt: raw.cancelledAt,
    cancelReasonCode:
      typeof raw.cancelReasonCode === "string"
        ? (raw.cancelReasonCode as VenueAllocationChangeReasonCode)
        : null,
    cancelReasonText: raw.cancelReasonText != null ? String(raw.cancelReasonText) : null,
    previousAllocatedTeamId:
      raw.previousAllocatedTeamId != null ? String(raw.previousAllocatedTeamId) : null,
  };
}

function parseChangeLog(id: string, raw: Record<string, unknown>): VenueAllocationChangeLog {
  return {
    id,
    federationId: String(raw.federationId || ""),
    venueId: String(raw.venueId || ""),
    bookingDate: String(raw.bookingDate || ""),
    startTime: String(raw.startTime || ""),
    endTime: String(raw.endTime || ""),
    slotAllocationId: String(raw.slotAllocationId || ""),
    changeType: raw.changeType === "REALLOCATE" ? "REALLOCATE" : "CANCEL",
    reasonCode: String(raw.reasonCode || "OTHER") as VenueAllocationChangeReasonCode,
    reasonText: raw.reasonText != null ? String(raw.reasonText) : null,
    fromTeamId: raw.fromTeamId != null ? String(raw.fromTeamId) : null,
    toTeamId: raw.toTeamId != null ? String(raw.toTeamId) : null,
    allocationSource:
      raw.allocationSource === "REQUEST_SELECTION" || raw.allocationSource === "ADMIN_DIRECT"
        ? raw.allocationSource
        : null,
    changedByUid: String(raw.changedByUid || ""),
    changedAt: raw.changedAt,
    createdAt: raw.createdAt,
  };
}

export type AllocationSlotView = {
  startTime: string;
  endTime: string;
  status: AllocationSlotUiStatus;
  /** Own pending request id */
  ownRequestId?: string;
  requestCount?: number;
  winnerTeamId?: string;
  isOwnAllocated?: boolean;
  /** Baseline provenance present — NOT treated as final club allocation until reconciled */
  hasBaselineProvenance?: boolean;
  baselineAllocationId?: string;
};

/**
 * Board occupancy:
 * - REQUESTED requests do NOT block other clubs
 * - venueSlotAllocations OR legacy APPROVED bookings → ALLOCATED (blocking)
 * - baseline OCCUPIED → provenance only (BASELINE_ALLOCATION_SEMANTIC_RECONCILIATION_REQUIRED)
 *   — NOT shown as final club 배정 완료; slots remain requestable
 */
export function buildAllocationSlotViews(input: {
  requests: VenueAllocationRequest[];
  winners: VenueSlotAllocation[];
  legacyBookings?: VenueBooking[];
  baselines?: VenueBaselineAllocation[];
  viewerTeamId?: string | null;
  dayStart?: string;
  dayEnd?: string;
}): AllocationSlotView[] {
  const dayStart = input.dayStart ?? DEFAULT_DAY_SLOT_START;
  const dayEnd = input.dayEnd ?? DEFAULT_DAY_SLOT_END;
  const slots = buildTwoHourSlots(dayStart, dayEnd);
  const viewerTeamId = input.viewerTeamId || null;

  const winnersBySlot = new Map<string, VenueSlotAllocation>();
  for (const w of input.winners) {
    if (w.status === "ALLOCATED") {
      winnersBySlot.set(`${w.startTime}|${w.endTime}`, w);
    }
  }

  // Legacy APPROVED = final allocation (backward compat)
  for (const b of input.legacyBookings || []) {
    if (b.bookingStatus !== "APPROVED") continue;
    const key = `${b.startTime}|${b.endTime}`;
    if (!winnersBySlot.has(key) && b.teamId) {
      winnersBySlot.set(key, {
        id: b.id,
        federationId: b.federationId,
        venueId: b.venueId,
        bookingDate: b.bookingDate,
        startTime: b.startTime,
        endTime: b.endTime,
        allocatedTeamId: b.teamId,
        allocatedTeamName: b.teamName,
        allocatedRequestId: b.id,
        allocatedByUid: b.decidedByUid || "",
        allocatedAt: b.decidedAt,
        allocationSource: "REQUEST_SELECTION",
        status: "ALLOCATED",
      });
    }
  }

  const requestsBySlot = new Map<string, VenueAllocationRequest[]>();
  for (const r of input.requests) {
    if (r.requestStatus !== "REQUESTED" && r.requestStatus !== "ALLOCATED") continue;
    const key = `${r.startTime}|${r.endTime}`;
    const list = requestsBySlot.get(key) || [];
    list.push(r);
    requestsBySlot.set(key, list);
  }

  // Also include legacy REQUESTED as competing (read-compat)
  for (const b of input.legacyBookings || []) {
    if (b.bookingStatus !== "REQUESTED" || !b.teamId) continue;
    const key = `${b.startTime}|${b.endTime}`;
    const list = requestsBySlot.get(key) || [];
    if (!list.some((x) => x.teamId === b.teamId)) {
      list.push({
        id: b.id,
        federationId: b.federationId,
        venueId: b.venueId,
        venueName: b.venueName,
        bookingDate: b.bookingDate,
        startTime: b.startTime,
        endTime: b.endTime,
        teamId: b.teamId,
        teamName: b.teamName,
        createdByUid: b.createdByUid,
        requestStatus: "REQUESTED",
        paymentStatus: b.paymentStatus,
        pricingStatus: b.pricingStatus,
        pricingPolicyId: b.pricingPolicyId,
        pricingSnapshot: b.pricingSnapshot,
        baseAmount: b.baseAmount,
        lightingAmount: b.lightingAmount,
        totalAmount: b.totalAmount,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      });
      requestsBySlot.set(key, list);
    }
  }

  const baselineBySlot = new Map<string, VenueBaselineAllocation>();
  for (const a of input.baselines || []) {
    if (a.status === "OCCUPIED") {
      baselineBySlot.set(`${a.startTime}|${a.endTime}`, a);
    }
  }

  return slots.map((s) => {
    const key = `${s.startTime}|${s.endTime}`;
    const winner = winnersBySlot.get(key);
    const reqs = requestsBySlot.get(key) || [];
    const baseline = baselineBySlot.get(key);
    const ownPending = viewerTeamId
      ? reqs.find((r) => r.teamId === viewerTeamId && r.requestStatus === "REQUESTED")
      : undefined;

    if (winner) {
      return {
        ...s,
        status: "ALLOCATED" as const,
        winnerTeamId: winner.allocatedTeamId,
        isOwnAllocated: Boolean(viewerTeamId && winner.allocatedTeamId === viewerTeamId),
        requestCount: reqs.length,
        hasBaselineProvenance: Boolean(baseline),
        baselineAllocationId: baseline?.id,
      };
    }

    if (ownPending) {
      return {
        ...s,
        status: "OWN_PENDING" as const,
        ownRequestId: ownPending.id,
        requestCount: reqs.length,
        hasBaselineProvenance: Boolean(baseline),
        baselineAllocationId: baseline?.id,
      };
    }

    return {
      ...s,
      status: "AVAILABLE" as const,
      requestCount: reqs.length,
      hasBaselineProvenance: Boolean(baseline),
      baselineAllocationId: baseline?.id,
    };
  });
}

export { formatAllocationSlotLabel };

export async function createVenueAllocationRequest(input: {
  federationSlug: string;
  venueId: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  teamId: string;
  teamName: string;
  uid: string;
}): Promise<string> {
  const duration = clockToMinutes(input.endTime) - clockToMinutes(input.startTime);
  if (duration !== VENUE_SLOT_INTERVAL_MINUTES) {
    throw new Error("배정 신청은 2시간 단위만 가능합니다.");
  }
  if (!input.teamId.trim()) {
    throw new Error("신청 팀 식별자가 필요합니다.");
  }

  const requestId = venueAllocationRequestDocId(
    input.venueId,
    input.bookingDate,
    input.startTime,
    input.teamId
  );
  const requestRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueAllocationRequests",
    requestId
  );
  const winnerId = venueSlotAllocationDocId(
    input.venueId,
    input.bookingDate,
    input.startTime
  );
  const winnerRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueSlotAllocations",
    winnerId
  );

  // Legacy APPROVED on old booking path still blocks
  const legacyBookingRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueBookings",
    winnerId
  );

  await runTransaction(db, async (tx) => {
    const winnerSnap = await tx.get(winnerRef);
    if (winnerSnap.exists() && String(winnerSnap.data()?.status) === "ALLOCATED") {
      throw new Error("이미 배정된 시간입니다.");
    }
    const legacy = await tx.get(legacyBookingRef);
    if (legacy.exists() && String(legacy.data()?.bookingStatus) === "APPROVED") {
      throw new Error("이미 배정된 시간입니다.");
    }

    const existing = await tx.get(requestRef);
    if (existing.exists()) {
      const st = String(existing.data()?.requestStatus || "");
      if (st === "REQUESTED" || st === "ALLOCATED") {
        throw new Error("이미 해당 슬롯에 배정 신청이 있습니다.");
      }
      // NOT_ALLOCATED / WITHDRAWN → allow re-request overwrite
    }

    tx.set(requestRef, {
      federationId: input.federationSlug,
      venueId: input.venueId,
      venueName: input.venueName,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      teamId: input.teamId,
      teamName: input.teamName,
      createdByUid: input.uid,
      requestStatus: "REQUESTED",
      paymentStatus: "UNCONFIRMED",
      pricingStatus: "REVIEW_REQUIRED",
      pricingPolicyId: null,
      pricingSnapshot: null,
      baseAmount: 0,
      lightingAmount: 0,
      totalAmount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return requestId;
}

/**
 * Federation admin selects exactly one REQUESTED club for the slot.
 * Atomic: creates venueSlotAllocations winner cursor; peers → NOT_ALLOCATED.
 */
export async function allocateVenueSlotToTeam(input: {
  federationSlug: string;
  requestId: string;
  adminUid: string;
}): Promise<void> {
  const requestsCol = collection(
    db,
    "federations",
    input.federationSlug,
    "venueAllocationRequests"
  );
  const requestRef = doc(requestsCol, input.requestId);
  const pre = await getDoc(requestRef);
  if (!pre.exists()) throw new Error("배정 신청을 찾을 수 없습니다.");
  const preData = pre.data() as Record<string, unknown>;
  if (String(preData.requestStatus) !== "REQUESTED") {
    throw new Error("배정 심사 중 상태가 아닙니다.");
  }

  const venueId = String(preData.venueId || "");
  const bookingDate = String(preData.bookingDate || "");
  const startTime = String(preData.startTime || "");
  const endTime = String(preData.endTime || "");
  const teamId = String(preData.teamId || "");
  const teamName = preData.teamName != null ? String(preData.teamName) : "";

  const winnerId = venueSlotAllocationDocId(venueId, bookingDate, startTime);
  const winnerRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueSlotAllocations",
    winnerId
  );

  const peersSnap = await getDocs(
    query(
      requestsCol,
      where("venueId", "==", venueId),
      where("bookingDate", "==", bookingDate),
      where("startTime", "==", startTime),
      where("requestStatus", "==", "REQUESTED")
    )
  );
  const peerRefs = peersSnap.docs
    .filter((d) => {
      if (d.id === input.requestId) return false;
      return String(d.data()?.endTime) === endTime;
    })
    .map((d) => d.ref);

  await runTransaction(db, async (tx) => {
    // All reads first
    const winnerSnap = await tx.get(winnerRef);
    if (winnerSnap.exists() && String(winnerSnap.data()?.status) === "ALLOCATED") {
      throw new Error("이미 배정된 시간입니다.");
    }

    const snap = await tx.get(requestRef);
    if (!snap.exists()) throw new Error("배정 신청을 찾을 수 없습니다.");
    if (String(snap.data()?.requestStatus) !== "REQUESTED") {
      throw new Error("배정 심사 중 상태가 아닙니다.");
    }

    const peerSnaps = [];
    for (const peerRef of peerRefs) {
      peerSnaps.push({ ref: peerRef, snap: await tx.get(peerRef) });
    }
    for (const p of peerSnaps) {
      if (p.snap.exists() && String(p.snap.data()?.requestStatus) === "ALLOCATED") {
        throw new Error("이미 배정된 시간입니다.");
      }
    }

    // Writes
    tx.set(winnerRef, {
      federationId: input.federationSlug,
      venueId,
      bookingDate,
      startTime,
      endTime,
      allocatedTeamId: teamId,
      allocatedTeamName: teamName || null,
      allocatedRequestId: input.requestId,
      allocatedByUid: input.adminUid,
      allocatedAt: serverTimestamp(),
      allocationSource: "REQUEST_SELECTION",
      status: "ALLOCATED",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    tx.update(requestRef, {
      requestStatus: "ALLOCATED",
      allocationSource: "REQUEST_SELECTION",
      paymentStatus: "UNCONFIRMED",
      allocatedByUid: input.adminUid,
      allocatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const p of peerSnaps) {
      if (p.snap.exists() && String(p.snap.data()?.requestStatus) === "REQUESTED") {
        tx.update(p.ref, {
          requestStatus: "NOT_ALLOCATED",
          updatedAt: serverTimestamp(),
          allocatedByUid: input.adminUid,
          allocatedAt: serverTimestamp(),
        });
      }
    }
  });
}

/**
 * Path B — Federation admin direct pre-allocation (no prior club request required).
 * Shares the same one-winner cursor as REQUEST_SELECTION.
 * If other clubs already REQUESTED, caller must pass acknowledgePendingOverride=true.
 */
export async function adminDirectAllocateVenueSlot(input: {
  federationSlug: string;
  venueId: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  /** Canonical federation team id — never free-text invent */
  teamId: string;
  teamName: string;
  adminUid: string;
  acknowledgePendingOverride?: boolean;
}): Promise<{ requestId: string; slotAllocationId: string; overriddenPendingCount: number }> {
  const duration = clockToMinutes(input.endTime) - clockToMinutes(input.startTime);
  if (duration !== VENUE_SLOT_INTERVAL_MINUTES) {
    throw new Error("배정은 2시간 단위만 가능합니다.");
  }
  if (!input.teamId.trim()) {
    throw new Error("협회 가입 클럽을 선택해야 합니다.");
  }

  const requestsCol = collection(
    db,
    "federations",
    input.federationSlug,
    "venueAllocationRequests"
  );
  const requestId = venueAllocationRequestDocId(
    input.venueId,
    input.bookingDate,
    input.startTime,
    input.teamId
  );
  const requestRef = doc(requestsCol, requestId);
  const winnerId = venueSlotAllocationDocId(
    input.venueId,
    input.bookingDate,
    input.startTime
  );
  const winnerRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueSlotAllocations",
    winnerId
  );
  const legacyBookingRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueBookings",
    winnerId
  );

  const pendingSnap = await getDocs(
    query(
      requestsCol,
      where("venueId", "==", input.venueId),
      where("bookingDate", "==", input.bookingDate),
      where("startTime", "==", input.startTime),
      where("requestStatus", "==", "REQUESTED")
    )
  );
  const pendingPeers = pendingSnap.docs.filter((d) => {
    const data = d.data() as Record<string, unknown>;
    return String(data.endTime) === input.endTime && d.id !== requestId;
  });
  if (pendingPeers.length > 0 && !input.acknowledgePendingOverride) {
    throw new Error(
      `PENDING_OVERRIDE_REQUIRED:${pendingPeers.length}`
    );
  }

  await runTransaction(db, async (tx) => {
    const winnerSnap = await tx.get(winnerRef);
    if (winnerSnap.exists() && String(winnerSnap.data()?.status) === "ALLOCATED") {
      throw new Error("이미 배정된 시간입니다.");
    }
    const legacy = await tx.get(legacyBookingRef);
    if (legacy.exists() && String(legacy.data()?.bookingStatus) === "APPROVED") {
      throw new Error("이미 배정된 시간입니다.");
    }

    const existingReq = await tx.get(requestRef);
    const peerSnaps = [];
    for (const d of pendingPeers) {
      peerSnaps.push({ ref: d.ref, snap: await tx.get(d.ref) });
    }

    tx.set(winnerRef, {
      federationId: input.federationSlug,
      venueId: input.venueId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      allocatedTeamId: input.teamId,
      allocatedTeamName: input.teamName || null,
      allocatedRequestId: requestId,
      allocatedByUid: input.adminUid,
      allocatedAt: serverTimestamp(),
      allocationSource: "ADMIN_DIRECT",
      status: "ALLOCATED",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const winnerRequestBody = {
      federationId: input.federationSlug,
      venueId: input.venueId,
      venueName: input.venueName,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      teamId: input.teamId,
      teamName: input.teamName,
      createdByUid: existingReq.exists()
        ? String(existingReq.data()?.createdByUid || input.adminUid)
        : input.adminUid,
      requestStatus: "ALLOCATED",
      allocationSource: "ADMIN_DIRECT",
      paymentStatus: "UNCONFIRMED",
      pricingStatus: "REVIEW_REQUIRED",
      pricingPolicyId: null,
      pricingSnapshot: null,
      baseAmount: 0,
      lightingAmount: 0,
      totalAmount: 0,
      allocatedByUid: input.adminUid,
      allocatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(existingReq.exists() ? {} : { createdAt: serverTimestamp() }),
    };

    if (existingReq.exists()) {
      const st = String(existingReq.data()?.requestStatus || "");
      if (st === "ALLOCATED") {
        throw new Error("이미 배정된 시간입니다.");
      }
      tx.update(requestRef, winnerRequestBody);
    } else {
      tx.set(requestRef, {
        ...winnerRequestBody,
        createdAt: serverTimestamp(),
      });
    }

    for (const p of peerSnaps) {
      if (p.snap.exists() && String(p.snap.data()?.requestStatus) === "REQUESTED") {
        tx.update(p.ref, {
          requestStatus: "NOT_ALLOCATED",
          updatedAt: serverTimestamp(),
          allocatedByUid: input.adminUid,
          allocatedAt: serverTimestamp(),
        });
      }
    }
  });

  return {
    requestId,
    slotAllocationId: winnerId,
    overriddenPendingCount: pendingPeers.length,
  };
}

/** Pending REQUESTED clubs for a slot (admin override warning). */
export async function listPendingRequestsForSlot(input: {
  federationSlug: string;
  venueId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
}): Promise<VenueAllocationRequest[]> {
  const snap = await getDocs(
    query(
      collection(db, "federations", input.federationSlug, "venueAllocationRequests"),
      where("venueId", "==", input.venueId),
      where("bookingDate", "==", input.bookingDate),
      where("startTime", "==", input.startTime),
      where("requestStatus", "==", "REQUESTED")
    )
  );
  return snap.docs
    .map((d) => parseAllocationRequest(d.id, d.data() as Record<string, unknown>))
    .filter((r) => r.endTime === input.endTime);
}

export function subscribeVenueAllocationDay(input: {
  federationSlug: string;
  venueId: string;
  bookingDate: string;
  viewerTeamId?: string | null;
  onData: (slots: AllocationSlotView[]) => void;
  onError?: (e: Error) => void;
}): Unsubscribe {
  let requests: VenueAllocationRequest[] = [];
  let winners: VenueSlotAllocation[] = [];
  let legacyBookings: VenueBooking[] = [];
  let baselines: VenueBaselineAllocation[] = [];

  const emit = () =>
    input.onData(
      buildAllocationSlotViews({
        requests,
        winners,
        legacyBookings,
        baselines,
        viewerTeamId: input.viewerTeamId,
      })
    );

  const reqQ = query(
    collection(db, "federations", input.federationSlug, "venueAllocationRequests"),
    where("venueId", "==", input.venueId),
    where("bookingDate", "==", input.bookingDate)
  );
  const winQ = query(
    collection(db, "federations", input.federationSlug, "venueSlotAllocations"),
    where("venueId", "==", input.venueId),
    where("bookingDate", "==", input.bookingDate)
  );
  const bookQ = query(
    collection(db, "federations", input.federationSlug, "venueBookings"),
    where("venueId", "==", input.venueId),
    where("bookingDate", "==", input.bookingDate)
  );
  const baseQ = query(
    collection(db, "federations", input.federationSlug, "venueBaselineAllocations"),
    where("venueId", "==", input.venueId),
    where("bookingDate", "==", input.bookingDate)
  );

  const u1 = onSnapshot(
    reqQ,
    (snap) => {
      requests = snap.docs.map((d) =>
        parseAllocationRequest(d.id, d.data() as Record<string, unknown>)
      );
      emit();
    },
    (e) => input.onError?.(e)
  );
  const u2 = onSnapshot(
    winQ,
    (snap) => {
      winners = snap.docs.map((d) =>
        parseSlotAllocation(d.id, d.data() as Record<string, unknown>)
      );
      emit();
    },
    (e) => input.onError?.(e)
  );
  const u3 = onSnapshot(
    bookQ,
    (snap) => {
      legacyBookings = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          federationId: String(raw.federationId || ""),
          venueId: String(raw.venueId || ""),
          venueName: raw.venueName != null ? String(raw.venueName) : undefined,
          bookingDate: String(raw.bookingDate || ""),
          startTime: String(raw.startTime || ""),
          endTime: String(raw.endTime || ""),
          applicantType: "team",
          teamId: raw.teamId != null ? String(raw.teamId) : undefined,
          teamName: raw.teamName != null ? String(raw.teamName) : undefined,
          bookingStatus: (raw.bookingStatus as VenueBooking["bookingStatus"]) || "REQUESTED",
          paymentStatus: raw.paymentStatus === "CONFIRMED" ? "CONFIRMED" : "UNCONFIRMED",
          pricingStatus:
            (raw.pricingStatus as VenueBooking["pricingStatus"]) || "REVIEW_REQUIRED",
          pricingPolicyId: raw.pricingPolicyId != null ? String(raw.pricingPolicyId) : null,
          pricingSnapshot: raw.pricingSnapshot ?? null,
          baseAmount: typeof raw.baseAmount === "number" ? raw.baseAmount : 0,
          lightingAmount: typeof raw.lightingAmount === "number" ? raw.lightingAmount : 0,
          totalAmount: typeof raw.totalAmount === "number" ? raw.totalAmount : 0,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          createdByUid: String(raw.createdByUid || ""),
          decidedAt: raw.decidedAt,
          decidedByUid: raw.decidedByUid != null ? String(raw.decidedByUid) : undefined,
        };
      });
      emit();
    },
    (e) => input.onError?.(e)
  );
  const u4 = onSnapshot(
    baseQ,
    (snap) => {
      baselines = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          federationId: String(raw.federationId || ""),
          venueId: String(raw.venueId || ""),
          bookingDate: String(raw.bookingDate || ""),
          startTime: String(raw.startTime || ""),
          endTime: String(raw.endTime || ""),
          sourceType: "XLSX_BASELINE" as const,
          sourceAllocationLabel: String(raw.sourceAllocationLabel || ""),
          sourceFile: String(raw.sourceFile || ""),
          sourceSheet: String(raw.sourceSheet || ""),
          sourceCell: String(raw.sourceCell || ""),
          status: "OCCUPIED" as const,
          importManifestVersion: String(raw.importManifestVersion || ""),
          createdAt: raw.createdAt,
          importedAt: raw.importedAt,
        };
      });
      emit();
    },
    (e) => input.onError?.(e)
  );

  return () => {
    u1();
    u2();
    u3();
    u4();
  };
}

export function subscribeAllVenueAllocationRequests(
  federationSlug: string,
  onData: (rows: VenueAllocationRequest[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "federations", federationSlug, "venueAllocationRequests"),
    (snap) => {
      const rows = snap.docs
        .map((d) => parseAllocationRequest(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) =>
          `${b.bookingDate}${b.startTime}`.localeCompare(`${a.bookingDate}${a.startTime}`)
        );
      onData(rows);
    },
    (e) => onError?.(e)
  );
}

export function slotRequestsFor(
  rows: VenueAllocationRequest[],
  venueId: string,
  bookingDate: string,
  startTime: string,
  endTime: string
): VenueAllocationRequest[] {
  return rows.filter(
    (r) =>
      r.venueId === venueId &&
      r.bookingDate === bookingDate &&
      r.startTime === startTime &&
      r.endTime === endTime
  );
}

/** Roll up ALL-mode board rows into per-day counts for the calendar. */
export function summarizeBoardRowsByDate(
  rows: AdminMonthlyBoardRow[]
): Map<string, AdminCalendarDaySummary> {
  const map = new Map<string, AdminCalendarDaySummary>();
  for (const r of rows) {
    let s = map.get(r.bookingDate);
    if (!s) {
      s = {
        bookingDate: r.bookingDate,
        open: 0,
        requestPool: 0,
        adminDirect: 0,
        requestSelection: 0,
      };
      map.set(r.bookingDate, s);
    }
    if (r.status === "OPEN") s.open += 1;
    else if (r.status === "REQUEST_POOL") s.requestPool += 1;
    else if (r.status === "ALLOCATED") {
      if (r.winner?.allocationSource === "ADMIN_DIRECT") s.adminDirect += 1;
      else s.requestSelection += 1;
    }
  }
  return map;
}

/**
 * Month grid cells, Monday-first (월…일).
 * `date` null = leading/trailing pad.
 */
export function buildMonthCalendarCells(yearMonth: string): Array<{
  date: string | null;
  day: number | null;
}> {
  const dates = datesInYearMonth(yearMonth);
  if (dates.length === 0) return [];
  const first = dates[0];
  const [y, m] = first.split("-").map((x) => Number(x));
  // JS: 0=Sun … 6=Sat → Monday-first index 0=Mon
  const jsDow = new Date(y, m - 1, 1).getDay();
  const mondayIndex = (jsDow + 6) % 7;
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < mondayIndex; i++) cells.push({ date: null, day: null });
  for (const d of dates) {
    cells.push({ date: d, day: Number(d.slice(8, 10)) });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

/** YYYY-MM → list of YYYY-MM-DD for that calendar month (local). */
export function datesInYearMonth(yearMonth: string): string[] {
  const m = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!m) return [];
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!y || mo < 1 || mo > 12) return [];
  const last = new Date(y, mo, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    out.push(`${m[1]}-${m[2]}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

function resolveBoardRow(
  venueId: string,
  venueName: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  requests: VenueAllocationRequest[],
  winners: VenueSlotAllocation[]
): AdminMonthlyBoardRow {
  const pending = requests.filter(
    (r) =>
      r.venueId === venueId &&
      r.bookingDate === bookingDate &&
      r.startTime === startTime &&
      r.endTime === endTime &&
      r.requestStatus === "REQUESTED"
  );
  const winner =
    winners.find(
      (w) =>
        w.status === "ALLOCATED" &&
        w.venueId === venueId &&
        w.bookingDate === bookingDate &&
        w.startTime === startTime &&
        w.endTime === endTime
    ) || null;
  let status: AdminMonthlyBoardRow["status"] = "OPEN";
  if (winner) status = "ALLOCATED";
  else if (pending.length > 0) status = "REQUEST_POOL";
  return {
    key: `${venueId}|${bookingDate}|${startTime}|${endTime}`,
    venueId,
    venueName,
    bookingDate,
    startTime,
    endTime,
    status,
    requestCount: pending.length,
    pendingRequests: pending,
    winner,
    winnerTeamName: winner?.allocatedTeamName || winner?.allocatedTeamId,
  };
}

/**
 * Month board rows.
 * - mode ALL (default when venue selected): every date × 2h slot for that venue
 * - mode ACTIVITY: only slots with requests / active winner (multi-venue ok)
 */
export function buildMonthlyAllocationBoard(input: {
  yearMonth: string; // YYYY-MM
  venues: Array<{ id: string; name: string }>;
  requests: VenueAllocationRequest[];
  winners: VenueSlotAllocation[];
  venueIdFilter?: string | null;
  /** ALL = full month grid (requires venueIdFilter). ACTIVITY = sparse. */
  mode?: "ALL" | "ACTIVITY";
}): AdminMonthlyBoardRow[] {
  const venueName = new Map(input.venues.map((v) => [v.id, v.name]));
  const prefix = input.yearMonth;
  const mode =
    input.mode ||
    (input.venueIdFilter ? "ALL" : "ACTIVITY");

  if (mode === "ALL") {
    const venueId = input.venueIdFilter;
    if (!venueId) return [];
    const name = venueName.get(venueId) || venueId;
    const slots = buildTwoHourSlots();
    const dates = datesInYearMonth(prefix);
    const rows: AdminMonthlyBoardRow[] = [];
    for (const bookingDate of dates) {
      for (const s of slots) {
        rows.push(
          resolveBoardRow(
            venueId,
            name,
            bookingDate,
            s.startTime,
            s.endTime,
            input.requests,
            input.winners
          )
        );
      }
    }
    return rows;
  }

  const keys = new Set<string>();
  for (const r of input.requests) {
    if (!r.bookingDate.startsWith(prefix)) continue;
    if (input.venueIdFilter && r.venueId !== input.venueIdFilter) continue;
    if (
      r.requestStatus !== "REQUESTED" &&
      r.requestStatus !== "ALLOCATED" &&
      r.requestStatus !== "NOT_ALLOCATED"
    ) {
      continue;
    }
    keys.add(`${r.venueId}|${r.bookingDate}|${r.startTime}|${r.endTime}`);
  }
  for (const w of input.winners) {
    if (w.status !== "ALLOCATED") continue;
    if (!w.bookingDate.startsWith(prefix)) continue;
    if (input.venueIdFilter && w.venueId !== input.venueIdFilter) continue;
    keys.add(`${w.venueId}|${w.bookingDate}|${w.startTime}|${w.endTime}`);
  }

  const rows: AdminMonthlyBoardRow[] = [];
  for (const key of keys) {
    const [venueId, bookingDate, startTime, endTime] = key.split("|");
    rows.push(
      resolveBoardRow(
        venueId,
        venueName.get(venueId) || venueId,
        bookingDate,
        startTime,
        endTime,
        input.requests,
        input.winners
      )
    );
  }

  return rows.sort((a, b) =>
    `${a.bookingDate}${a.startTime}${a.venueId}`.localeCompare(
      `${b.bookingDate}${b.startTime}${b.venueId}`
    )
  );
}

/**
 * P12 — Cancel ALLOCATED winner → CANCELLED; slot becomes OPEN.
 * Append-only change log. Peers NOT_ALLOCATED are not revived.
 */
export async function cancelVenueSlotAllocation(input: {
  federationSlug: string;
  venueId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  adminUid: string;
  reasonCode: VenueAllocationChangeReasonCode;
  reasonText?: string | null;
}): Promise<void> {
  const { reasonCode, reasonText } = assertAllocationReason(
    input.reasonCode,
    input.reasonText
  );
  const winnerId = venueSlotAllocationDocId(
    input.venueId,
    input.bookingDate,
    input.startTime
  );
  const winnerRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueSlotAllocations",
    winnerId
  );
  const logsCol = collection(
    db,
    "federations",
    input.federationSlug,
    "venueAllocationChangeLogs"
  );

  await runTransaction(db, async (tx) => {
    const winnerSnap = await tx.get(winnerRef);
    if (!winnerSnap.exists() || String(winnerSnap.data()?.status) !== "ALLOCATED") {
      throw new Error("취소할 배정이 없습니다.");
    }
    const w = winnerSnap.data() as Record<string, unknown>;
    const requestId = String(w.allocatedRequestId || "");
    const fromTeamId = String(w.allocatedTeamId || "");
    const requestRef = requestId
      ? doc(
          db,
          "federations",
          input.federationSlug,
          "venueAllocationRequests",
          requestId
        )
      : null;
    const requestSnap = requestRef ? await tx.get(requestRef) : null;
    const logRef = doc(logsCol);

    tx.update(winnerRef, {
      status: "CANCELLED",
      cancelledByUid: input.adminUid,
      cancelledAt: serverTimestamp(),
      cancelReasonCode: reasonCode,
      cancelReasonText: reasonText,
      updatedAt: serverTimestamp(),
    });

    if (requestSnap?.exists()) {
      tx.update(requestRef!, {
        requestStatus: "CANCELLED",
        updatedAt: serverTimestamp(),
        allocatedByUid: input.adminUid,
        allocatedAt: serverTimestamp(),
      });
    }

    tx.set(logRef, {
      federationId: input.federationSlug,
      venueId: input.venueId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      slotAllocationId: winnerId,
      changeType: "CANCEL",
      reasonCode,
      reasonText,
      fromTeamId,
      toTeamId: null,
      allocationSource: null,
      changedByUid: input.adminUid,
      changedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });
}

/**
 * P11 — Reallocate A→B: old request CANCELLED, new ALLOCATED, winner updated, log append.
 */
export async function reallocateVenueSlotAllocation(input: {
  federationSlug: string;
  venueId: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  toTeamId: string;
  toTeamName: string;
  adminUid: string;
  reasonCode: VenueAllocationChangeReasonCode;
  reasonText?: string | null;
  allocationSource: VenueAllocationSource;
  /** When REQUEST_SELECTION from an existing pending request */
  winningRequestId?: string | null;
  acknowledgePendingOverride?: boolean;
}): Promise<void> {
  const { reasonCode, reasonText } = assertAllocationReason(
    input.reasonCode,
    input.reasonText
  );
  if (!input.toTeamId.trim()) throw new Error("협회 가입 클럽을 선택해야 합니다.");

  const requestsCol = collection(
    db,
    "federations",
    input.federationSlug,
    "venueAllocationRequests"
  );
  const winnerId = venueSlotAllocationDocId(
    input.venueId,
    input.bookingDate,
    input.startTime
  );
  const winnerRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueSlotAllocations",
    winnerId
  );
  const newRequestId =
    input.winningRequestId ||
    venueAllocationRequestDocId(
      input.venueId,
      input.bookingDate,
      input.startTime,
      input.toTeamId
    );
  const newRequestRef = doc(requestsCol, newRequestId);
  const logsCol = collection(
    db,
    "federations",
    input.federationSlug,
    "venueAllocationChangeLogs"
  );

  const pendingSnap = await getDocs(
    query(
      requestsCol,
      where("venueId", "==", input.venueId),
      where("bookingDate", "==", input.bookingDate),
      where("startTime", "==", input.startTime),
      where("requestStatus", "==", "REQUESTED")
    )
  );
  const pendingPeers = pendingSnap.docs.filter((d) => {
    const data = d.data() as Record<string, unknown>;
    return String(data.endTime) === input.endTime && d.id !== newRequestId;
  });
  if (
    pendingPeers.length > 0 &&
    input.allocationSource === "ADMIN_DIRECT" &&
    !input.acknowledgePendingOverride
  ) {
    throw new Error(`PENDING_OVERRIDE_REQUIRED:${pendingPeers.length}`);
  }

  await runTransaction(db, async (tx) => {
    const winnerSnap = await tx.get(winnerRef);
    if (!winnerSnap.exists() || String(winnerSnap.data()?.status) !== "ALLOCATED") {
      throw new Error("재배정할 배정이 없습니다.");
    }
    const w = winnerSnap.data() as Record<string, unknown>;
    const fromTeamId = String(w.allocatedTeamId || "");
    if (fromTeamId === input.toTeamId) {
      throw new Error("동일한 팀으로는 재배정할 수 없습니다.");
    }
    const oldRequestId = String(w.allocatedRequestId || "");
    const oldRequestRef = oldRequestId
      ? doc(requestsCol, oldRequestId)
      : null;
    const oldRequestSnap = oldRequestRef ? await tx.get(oldRequestRef) : null;
    const newRequestSnap = await tx.get(newRequestRef);
    const peerSnaps = [];
    for (const d of pendingPeers) {
      peerSnaps.push({ ref: d.ref, snap: await tx.get(d.ref) });
    }
    const logRef = doc(logsCol);

    if (oldRequestSnap?.exists() && oldRequestRef) {
      tx.update(oldRequestRef, {
        requestStatus: "CANCELLED",
        updatedAt: serverTimestamp(),
        allocatedByUid: input.adminUid,
        allocatedAt: serverTimestamp(),
      });
    }

    const winnerRequestBody = {
      federationId: input.federationSlug,
      venueId: input.venueId,
      venueName: input.venueName,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      teamId: input.toTeamId,
      teamName: input.toTeamName,
      requestStatus: "ALLOCATED",
      allocationSource: input.allocationSource,
      paymentStatus: "UNCONFIRMED",
      allocatedByUid: input.adminUid,
      allocatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (newRequestSnap.exists()) {
      tx.update(newRequestRef, winnerRequestBody);
    } else {
      tx.set(newRequestRef, {
        ...winnerRequestBody,
        createdByUid: input.adminUid,
        pricingStatus: "REVIEW_REQUIRED",
        pricingPolicyId: null,
        pricingSnapshot: null,
        baseAmount: 0,
        lightingAmount: 0,
        totalAmount: 0,
        createdAt: serverTimestamp(),
      });
    }

    tx.set(winnerRef, {
      federationId: input.federationSlug,
      venueId: input.venueId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      allocatedTeamId: input.toTeamId,
      allocatedTeamName: input.toTeamName || null,
      allocatedRequestId: newRequestId,
      allocatedByUid: input.adminUid,
      allocatedAt: serverTimestamp(),
      allocationSource: input.allocationSource,
      status: "ALLOCATED",
      previousAllocatedTeamId: fromTeamId,
      updatedAt: serverTimestamp(),
      createdAt: w.createdAt || serverTimestamp(),
    });

    for (const p of peerSnaps) {
      if (p.snap.exists() && String(p.snap.data()?.requestStatus) === "REQUESTED") {
        tx.update(p.ref, {
          requestStatus: "NOT_ALLOCATED",
          updatedAt: serverTimestamp(),
          allocatedByUid: input.adminUid,
          allocatedAt: serverTimestamp(),
        });
      }
    }

    tx.set(logRef, {
      federationId: input.federationSlug,
      venueId: input.venueId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      slotAllocationId: winnerId,
      changeType: "REALLOCATE",
      reasonCode,
      reasonText,
      fromTeamId,
      toTeamId: input.toTeamId,
      allocationSource: input.allocationSource,
      changedByUid: input.adminUid,
      changedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });
}

export function subscribeAllVenueSlotAllocations(
  federationSlug: string,
  onData: (rows: VenueSlotAllocation[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "federations", federationSlug, "venueSlotAllocations"),
    (snap) => {
      onData(snap.docs.map((d) => parseSlotAllocation(d.id, d.data() as Record<string, unknown>)));
    },
    (e) => onError?.(e)
  );
}

export async function listChangeLogsForSlot(input: {
  federationSlug: string;
  venueId: string;
  bookingDate: string;
  startTime: string;
}): Promise<VenueAllocationChangeLog[]> {
  const snap = await getDocs(
    query(
      collection(db, "federations", input.federationSlug, "venueAllocationChangeLogs"),
      where("venueId", "==", input.venueId),
      where("bookingDate", "==", input.bookingDate),
      where("startTime", "==", input.startTime)
    )
  );
  return snap.docs
    .map((d) => parseChangeLog(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

/** Exported for admin/tests — baseline id helper re-export */
export { venueBaselineAllocationDocId, assertAllocationReason };
