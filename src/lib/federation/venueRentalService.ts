/**
 * Nowon Venue Rental — read/write helpers.
 * Paths: federations/{slug}/venues · venueBookings · venueBaselineAllocations · venuePricingPolicies
 * Conflict: no overlapping REQUESTED|APPROVED booking OR OCCUPIED baseline for same venue+date+slot.
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
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_DAY_SLOT_END,
  DEFAULT_DAY_SLOT_START,
  VENUE_SLOT_INTERVAL_MINUTES,
  type FederationVenue,
  type SlotUiStatus,
  type VenueBaselineAllocation,
  type VenueBooking,
  type VenueBookingStatus,
  type VenuePricingStatus,
  type VenueSlotOccupancyKind,
  slotKey,
} from "@/lib/federation/venueRentalTypes";

const ACTIVE_BOOKING_STATUSES: VenueBookingStatus[] = ["REQUESTED", "APPROVED"];

/** Deterministic id — one active REQUESTED/APPROVED per venue+date+slot */
export function venueSlotBookingDocId(
  venueId: string,
  bookingDate: string,
  startTime: string
): string {
  const start = startTime.replace(":", "");
  return `slot_${venueId}_${bookingDate}_${start}`;
}

/** Deterministic baseline allocation id (matches extraction manifest allocationId) */
export function venueBaselineAllocationDocId(
  federationId: string,
  venueId: string,
  bookingDate: string,
  startTime: string,
  endTime: string
): string {
  return [
    federationId,
    venueId,
    bookingDate,
    startTime.replace(":", ""),
    endTime.replace(":", ""),
  ].join("__");
}

function parseBaseline(
  id: string,
  raw: Record<string, unknown>
): VenueBaselineAllocation {
  return {
    id,
    federationId: String(raw.federationId || ""),
    venueId: String(raw.venueId || ""),
    bookingDate: String(raw.bookingDate || ""),
    startTime: String(raw.startTime || ""),
    endTime: String(raw.endTime || ""),
    sourceType: "XLSX_BASELINE",
    sourceAllocationLabel: String(raw.sourceAllocationLabel || ""),
    sourceFile: String(raw.sourceFile || ""),
    sourceSheet: String(raw.sourceSheet || ""),
    sourceCell: String(raw.sourceCell || ""),
    status: "OCCUPIED",
    importManifestVersion: String(raw.importManifestVersion || ""),
    createdAt: raw.createdAt,
    importedAt: raw.importedAt,
  };
}

function parseVenue(id: string, raw: Record<string, unknown>): FederationVenue {
  const statusRaw = String(raw.status || "active");
  const sortRaw = raw.sortOrder;
  return {
    id,
    name: String(raw.name || "이름 없는 구장"),
    address: raw.address != null ? String(raw.address) : undefined,
    fieldType: raw.fieldType != null ? String(raw.fieldType) : undefined,
    status: statusRaw === "inactive" ? "inactive" : "active",
    sortOrder: typeof sortRaw === "number" ? sortRaw : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function sortVenues(rows: FederationVenue[]): FederationVenue[] {
  return [...rows].sort((a, b) => {
    const ao = a.sortOrder;
    const bo = b.sortOrder;
    if (typeof ao === "number" && typeof bo === "number" && ao !== bo) return ao - bo;
    if (typeof ao === "number" && typeof bo !== "number") return -1;
    if (typeof bo === "number" && typeof ao !== "number") return 1;
    return a.name.localeCompare(b.name, "ko");
  });
}

function parseBooking(id: string, raw: Record<string, unknown>): VenueBooking {
  return {
    id,
    federationId: String(raw.federationId || ""),
    venueId: String(raw.venueId || ""),
    venueName: raw.venueName != null ? String(raw.venueName) : undefined,
    bookingDate: String(raw.bookingDate || ""),
    startTime: String(raw.startTime || ""),
    endTime: String(raw.endTime || ""),
    applicantType: (raw.applicantType as VenueBooking["applicantType"]) || "team",
    applicantId: raw.applicantId != null ? String(raw.applicantId) : undefined,
    teamId: raw.teamId != null ? String(raw.teamId) : undefined,
    teamName: raw.teamName != null ? String(raw.teamName) : undefined,
    bookingStatus: (raw.bookingStatus as VenueBookingStatus) || "REQUESTED",
    paymentStatus: raw.paymentStatus === "CONFIRMED" ? "CONFIRMED" : "UNCONFIRMED",
    pricingStatus: (raw.pricingStatus as VenuePricingStatus) || "REVIEW_REQUIRED",
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
    rejectReason: raw.rejectReason != null ? String(raw.rejectReason) : undefined,
  };
}

function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function minutesToClock(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Build 2h slots from [start,end). */
export function buildTwoHourSlots(
  dayStart = DEFAULT_DAY_SLOT_START,
  dayEnd = DEFAULT_DAY_SLOT_END
): Array<{ startTime: string; endTime: string }> {
  const start = clockToMinutes(dayStart);
  const end = clockToMinutes(dayEnd);
  const out: Array<{ startTime: string; endTime: string }> = [];
  for (let t = start; t + VENUE_SLOT_INTERVAL_MINUTES <= end; t += VENUE_SLOT_INTERVAL_MINUTES) {
    out.push({
      startTime: minutesToClock(t),
      endTime: minutesToClock(t + VENUE_SLOT_INTERVAL_MINUTES),
    });
  }
  return out;
}

export async function listFederationVenues(federationSlug: string): Promise<FederationVenue[]> {
  const snap = await getDocs(collection(db, "federations", federationSlug, "venues"));
  return sortVenues(
    snap.docs
      .map((d) => parseVenue(d.id, d.data() as Record<string, unknown>))
      .filter((v) => v.status === "active")
  );
}

export function subscribeFederationVenues(
  federationSlug: string,
  onData: (venues: FederationVenue[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "federations", federationSlug, "venues"),
    (snap) => {
      const rows = sortVenues(
        snap.docs
          .map((d) => parseVenue(d.id, d.data() as Record<string, unknown>))
          .filter((v) => v.status === "active")
      );
      onData(rows);
    },
    (e) => onError?.(e)
  );
}

export async function getFederationVenue(
  federationSlug: string,
  venueId: string
): Promise<FederationVenue | null> {
  const snap = await getDoc(doc(db, "federations", federationSlug, "venues", venueId));
  if (!snap.exists()) return null;
  return parseVenue(snap.id, snap.data() as Record<string, unknown>);
}

/** Active pricing policy for venue on booking date — none ⇒ REVIEW_REQUIRED (no invented rates). */
export async function findActivePricingPolicyId(
  federationSlug: string,
  venueId: string,
  bookingDate: string
): Promise<string | null> {
  const snap = await getDocs(
    query(
      collection(db, "federations", federationSlug, "venuePricingPolicies"),
      where("venueId", "==", venueId),
      where("status", "==", "active")
    )
  );
  for (const d of snap.docs) {
    const raw = d.data() as Record<string, unknown>;
    const from = String(raw.effectiveFrom || "");
    const to = raw.effectiveTo != null ? String(raw.effectiveTo) : null;
    if (from && bookingDate < from) continue;
    if (to && bookingDate > to) continue;
    return d.id;
  }
  return null;
}

export async function listVenueBookingsForDate(
  federationSlug: string,
  venueId: string,
  bookingDate: string
): Promise<VenueBooking[]> {
  const snap = await getDocs(
    query(
      collection(db, "federations", federationSlug, "venueBookings"),
      where("venueId", "==", venueId),
      where("bookingDate", "==", bookingDate)
    )
  );
  return snap.docs.map((d) => parseBooking(d.id, d.data() as Record<string, unknown>));
}

export function subscribeVenueBookingsForDate(
  federationSlug: string,
  venueId: string,
  bookingDate: string,
  onData: (rows: VenueBooking[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const qy = query(
    collection(db, "federations", federationSlug, "venueBookings"),
    where("venueId", "==", venueId),
    where("bookingDate", "==", bookingDate)
  );
  return onSnapshot(
    qy,
    (snap) => onData(snap.docs.map((d) => parseBooking(d.id, d.data() as Record<string, unknown>))),
    (e) => onError?.(e)
  );
}

export async function listVenueBaselineAllocationsForDate(
  federationSlug: string,
  venueId: string,
  bookingDate: string
): Promise<VenueBaselineAllocation[]> {
  const snap = await getDocs(
    query(
      collection(db, "federations", federationSlug, "venueBaselineAllocations"),
      where("venueId", "==", venueId),
      where("bookingDate", "==", bookingDate),
      where("status", "==", "OCCUPIED")
    )
  );
  return snap.docs.map((d) => parseBaseline(d.id, d.data() as Record<string, unknown>));
}

export function subscribeVenueBaselineAllocationsForDate(
  federationSlug: string,
  venueId: string,
  bookingDate: string,
  onData: (rows: VenueBaselineAllocation[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const qy = query(
    collection(db, "federations", federationSlug, "venueBaselineAllocations"),
    where("venueId", "==", venueId),
    where("bookingDate", "==", bookingDate),
    where("status", "==", "OCCUPIED")
  );
  return onSnapshot(
    qy,
    (snap) =>
      onData(snap.docs.map((d) => parseBaseline(d.id, d.data() as Record<string, unknown>))),
    (e) => onError?.(e)
  );
}

export function subscribeAllVenueBaselineAllocations(
  federationSlug: string,
  onData: (rows: VenueBaselineAllocation[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "federations", federationSlug, "venueBaselineAllocations"),
    (snap) => {
      const rows = snap.docs
        .map((d) => parseBaseline(d.id, d.data() as Record<string, unknown>))
        .filter((r) => r.status === "OCCUPIED")
        .sort((a, b) => `${b.bookingDate}${b.startTime}`.localeCompare(`${a.bookingDate}${a.startTime}`));
      onData(rows);
    },
    (e) => onError?.(e)
  );
}

export async function hasOccupiedBaselineAllocation(input: {
  federationSlug: string;
  venueId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
}): Promise<boolean> {
  const id = venueBaselineAllocationDocId(
    input.federationSlug,
    input.venueId,
    input.bookingDate,
    input.startTime,
    input.endTime
  );
  const snap = await getDoc(
    doc(db, "federations", input.federationSlug, "venueBaselineAllocations", id)
  );
  if (!snap.exists()) return false;
  return String(snap.data()?.status || "") === "OCCUPIED";
}

export function subscribeAllVenueBookings(
  federationSlug: string,
  onData: (rows: VenueBooking[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "federations", federationSlug, "venueBookings"),
    (snap) => {
      const rows = snap.docs
        .map((d) => parseBooking(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => {
          const da = `${a.bookingDate} ${a.startTime}`;
          const db_ = `${b.bookingDate} ${b.startTime}`;
          return db_.localeCompare(da);
        });
      onData(rows);
    },
    (e) => onError?.(e)
  );
}

export type SlotView = {
  startTime: string;
  endTime: string;
  status: SlotUiStatus;
  bookingId?: string;
  /** Public: omit baseline labels; booking teamName allowed when booking row */
  teamName?: string;
  occupancyKind?: VenueSlotOccupancyKind;
  baselineAllocationId?: string;
};

export function buildSlotViews(
  bookings: VenueBooking[],
  baselines: VenueBaselineAllocation[] = [],
  dayStart = DEFAULT_DAY_SLOT_START,
  dayEnd = DEFAULT_DAY_SLOT_END
): SlotView[] {
  const slots = buildTwoHourSlots(dayStart, dayEnd);
  const bookingBySlot = new Map<string, VenueBooking>();
  for (const b of bookings) {
    if (!ACTIVE_BOOKING_STATUSES.includes(b.bookingStatus)) continue;
    bookingBySlot.set(`${b.startTime}|${b.endTime}`, b);
  }
  const baselineBySlot = new Map<string, VenueBaselineAllocation>();
  for (const a of baselines) {
    if (a.status !== "OCCUPIED") continue;
    baselineBySlot.set(`${a.startTime}|${a.endTime}`, a);
  }
  return slots.map((s) => {
    const key = `${s.startTime}|${s.endTime}`;
    const booking = bookingBySlot.get(key);
    const baseline = baselineBySlot.get(key);
    // Baseline occupancy wins for display as 배정 완료 even if a stale REQUESTED exists
    if (baseline) {
      return {
        ...s,
        status: "APPROVED" as const,
        occupancyKind: "BASELINE_ALLOCATION" as const,
        baselineAllocationId: baseline.id,
        // public: no sourceAllocationLabel
      };
    }
    if (!booking) {
      return { ...s, status: "AVAILABLE" as const };
    }
    return {
      ...s,
      status: booking.bookingStatus === "APPROVED" ? ("APPROVED" as const) : ("REQUESTED" as const),
      bookingId: booking.id,
      teamName: booking.teamName,
      occupancyKind: "BOOKING_REQUEST" as const,
    };
  });
}

/** Merge booking + baseline occupancy for a venue day (public slot UI). */
export function subscribeVenueDayOccupancy(
  federationSlug: string,
  venueId: string,
  bookingDate: string,
  onData: (slots: SlotView[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  let bookings: VenueBooking[] = [];
  let baselines: VenueBaselineAllocation[] = [];
  const emit = () => onData(buildSlotViews(bookings, baselines));
  const unsubB = subscribeVenueBookingsForDate(
    federationSlug,
    venueId,
    bookingDate,
    (rows) => {
      bookings = rows;
      emit();
    },
    onError
  );
  const unsubA = subscribeVenueBaselineAllocationsForDate(
    federationSlug,
    venueId,
    bookingDate,
    (rows) => {
      baselines = rows;
      emit();
    },
    onError
  );
  return () => {
    unsubB();
    unsubA();
  };
}

export async function createVenueBookingRequest(input: {
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
  const duration =
    clockToMinutes(input.endTime) - clockToMinutes(input.startTime);
  if (duration !== VENUE_SLOT_INTERVAL_MINUTES) {
    throw new Error("대관은 2시간 단위만 가능합니다.");
  }

  const bookingId = venueSlotBookingDocId(
    input.venueId,
    input.bookingDate,
    input.startTime
  );
  const bookingRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueBookings",
    bookingId
  );

  const pricingPolicyId = await findActivePricingPolicyId(
    input.federationSlug,
    input.venueId,
    input.bookingDate
  );
  const pricingStatus: VenuePricingStatus = pricingPolicyId ? "QUOTED" : "REVIEW_REQUIRED";

  if (
    await hasOccupiedBaselineAllocation({
      federationSlug: input.federationSlug,
      venueId: input.venueId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
    })
  ) {
    throw new Error("이미 배정된 시간입니다.");
  }

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(bookingRef);
    if (existing.exists()) {
      const st = String(existing.data()?.bookingStatus || "");
      if (st === "APPROVED") throw new Error("이미 배정된 시간입니다.");
      if (st === "REQUESTED") throw new Error("이미 승인 대기 중인 신청이 있습니다.");
      // REJECTED / CANCELLED → allow overwrite with new REQUESTED
    }

    const baselineId = venueBaselineAllocationDocId(
      input.federationSlug,
      input.venueId,
      input.bookingDate,
      input.startTime,
      input.endTime
    );
    const baselineSnap = await tx.get(
      doc(db, "federations", input.federationSlug, "venueBaselineAllocations", baselineId)
    );
    if (baselineSnap.exists() && String(baselineSnap.data()?.status || "") === "OCCUPIED") {
      throw new Error("이미 배정된 시간입니다.");
    }

    tx.set(bookingRef, {
      federationId: input.federationSlug,
      venueId: input.venueId,
      venueName: input.venueName,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      applicantType: "team",
      applicantId: input.uid,
      teamId: input.teamId,
      teamName: input.teamName,
      bookingStatus: "REQUESTED",
      paymentStatus: "UNCONFIRMED",
      pricingStatus,
      pricingPolicyId: pricingPolicyId ?? null,
      // Phase B: client estimate via venuePricingEngine only — do not persist snapshot
      // (BOOKING_PRICING_SNAPSHOT_CONTRACT_GAP; no rules weaken / no client injection)
      pricingSnapshot: null,
      baseAmount: 0,
      lightingAmount: 0,
      totalAmount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdByUid: input.uid,
    });
  });

  return bookingId;
}

export async function approveVenueBooking(input: {
  federationSlug: string;
  bookingId: string;
  adminUid: string;
}): Promise<void> {
  const bookingsCol = collection(db, "federations", input.federationSlug, "venueBookings");
  const bookingRef = doc(bookingsCol, input.bookingId);

  const pre = await getDoc(bookingRef);
  if (!pre.exists()) throw new Error("신청을 찾을 수 없습니다.");
  const preData = pre.data() as Record<string, unknown>;
  if (String(preData.bookingStatus) !== "REQUESTED") {
    throw new Error("승인 대기 상태가 아닙니다.");
  }
  const venueId = String(preData.venueId || "");
  const bookingDate = String(preData.bookingDate || "");
  const startTime = String(preData.startTime || "");
  const endTime = String(preData.endTime || "");

  const peersSnap = await getDocs(
    query(
      bookingsCol,
      where("venueId", "==", venueId),
      where("bookingDate", "==", bookingDate),
      where("bookingStatus", "==", "APPROVED")
    )
  );
  const peerRefs = peersSnap.docs
    .filter((d) => {
      if (d.id === input.bookingId) return false;
      const p = d.data() as Record<string, unknown>;
      return String(p.startTime) === startTime && String(p.endTime) === endTime;
    })
    .map((d) => d.ref);

  if (peerRefs.length > 0) {
    throw new Error("이미 배정된 시간입니다.");
  }

  if (
    await hasOccupiedBaselineAllocation({
      federationSlug: input.federationSlug,
      venueId,
      bookingDate,
      startTime,
      endTime,
    })
  ) {
    throw new Error("이미 배정된 시간입니다.");
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bookingRef);
    if (!snap.exists()) throw new Error("신청을 찾을 수 없습니다.");
    const data = snap.data() as Record<string, unknown>;
    if (String(data.bookingStatus) !== "REQUESTED") {
      throw new Error("승인 대기 상태가 아닙니다.");
    }
    for (const peerRef of peerRefs) {
      const peer = await tx.get(peerRef);
      if (peer.exists() && String(peer.data()?.bookingStatus) === "APPROVED") {
        throw new Error("이미 배정된 시간입니다.");
      }
    }
    const baselineId = venueBaselineAllocationDocId(
      input.federationSlug,
      venueId,
      bookingDate,
      startTime,
      endTime
    );
    const baselineSnap = await tx.get(
      doc(db, "federations", input.federationSlug, "venueBaselineAllocations", baselineId)
    );
    if (baselineSnap.exists() && String(baselineSnap.data()?.status || "") === "OCCUPIED") {
      throw new Error("이미 배정된 시간입니다.");
    }
    tx.update(bookingRef, {
      bookingStatus: "APPROVED",
      // payment stays UNCONFIRMED — unpaid ≠ auto-cancel (D3)
      updatedAt: serverTimestamp(),
      decidedAt: serverTimestamp(),
      decidedByUid: input.adminUid,
    });
  });
}

export async function rejectVenueBooking(input: {
  federationSlug: string;
  bookingId: string;
  adminUid: string;
  reason?: string;
}): Promise<void> {
  const bookingRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venueBookings",
    input.bookingId
  );
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error("신청을 찾을 수 없습니다.");
  const data = snap.data() as Record<string, unknown>;
  if (String(data.bookingStatus) !== "REQUESTED") {
    throw new Error("거절할 수 있는 상태가 아닙니다.");
  }
  await updateDoc(bookingRef, {
    bookingStatus: "REJECTED",
    rejectReason: input.reason?.trim() || null,
    updatedAt: serverTimestamp(),
    decidedAt: serverTimestamp(),
    decidedByUid: input.adminUid,
  });
}
