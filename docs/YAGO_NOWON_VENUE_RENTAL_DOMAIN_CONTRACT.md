# YAGO Nowon Venue Rental — Domain / Data Contract Design

```text
STATUS: DOMAIN CONTRACT PM APPROVED ✅ — BASELINE LOCKED
PHASE: SPRINT 1–2 COMPLETE / CLOSED 🔒 · SPRINT 3 COMPLETE / CLOSED 🔒
IMPLEMENTATION: SPRINT 1+2+3 COMPLETE
  Sprint 3 = pricing/lighting estimate engine v1.1 + Hosting verify
  (DISPLAY_ONLY_ESTIMATE · no Production pricing seed)
SPRINT 2: COMPLETE / CLOSED 🔒
  venueBaselineAllocations Production import = 235 ACCEPTED
  quarantine 75 = BACKLOG / HOLD 🔒
SPRINT 3 LOCK: docs/YAGO_NOWON_VENUE_RENTAL_SPRINT3_COMPLETE_LOCK.md
DATE: 2026-07-15

C4 v3 CANCELLATION / REFUND = ACCEPTED ✅ (PM 2026-07-15) — DO NOT MODIFY
24-HOUR EXACT TIME CUTOFF   = REMOVED ✅
CALCULATION BASIS           = ASIA/SEOUL CALENDAR-DAY TIER 🔒

LOCKS (PM ACCEPTED)
──────────────────
Tenant SoT            = federations/nowon-football
venues collection     = IDENTITY / PROFILE MASTER (COMPATIBLE_WITH_EXTENSION)
nowon-gu-football     = DIVERGENT SECONDARY — delete forbidden; no new core write
assoc-nowon-football  = ACTIVE LEGACY — preserve; new venue write / dual-write prohibited
Resolver map → gu     = REJECT / MUST NOT WIRE
/app/facility SoT     = DO_NOT_REUSE
P0 Audit phase        = CLOSED ✅
Sprint 1 apply/approve engine = COMPLETE ✅
D1 Entity             = 🔒 LOCK
D2 Pricing breakdown  = 🔒 LOCK (TOTAL-ONLY REJECTED; unit/min/slot = 2h LOCKED; 1h booking PROHIBITED)
D3 Booking≠Payment    = 🔒 LOCK (APPROVED/ALLOCATED + UNCONFIRMED is valid; unpaid ≠ auto-cancel)
                        3-axis: requestStatus · paymentStatus(+claim) · confirmStatus
                        PS5 CONDITIONAL UNLOCK — see Payment Signal design (2026-07-27)
D4 Refund review      = 🔒 LOCK (WEATHER auto-approve PROHIBITED; UsageStatus tri-state)
C4 General cancel     = 🔒 LOCK v3 ACCEPTED (KST day: 7+ FULL; 6–3 −10%; 2–1 −30%; day-of NO)
RefundBreakdown       = REQUIRED
Payment deadline      = 사용 전월까지; unpaid auto-cancel = DISABLED
venueSnapshot         = DEFERRED DESIGN QUESTION (not required yet)
Sprint 3 pricing/lighting policy baseline = LOCKED (see §6.5) — estimate ≠ payment

NEXT (separate PM GO)
= SPRINT 4 HOLD — payment / 납부 관리
= pricingSnapshot secure persist / refund runtime / quarantine-75
```

**This document is the locked design contract.**  
It does **not** create Firestore collections, routes, UI, or code modules.

Supersedes tenant id in earlier attachment design (`nowon-gu-football` as canonical) — **REJECTED by Production evidence.**

---

## 1. Purpose

Define the Nowon federation venue rental operating model as:

1. Aggregate boundaries  
2. TypeScript domain types (contract-level)  
3. Status / enum values  
4. Pure engine input/output contracts  
5. Firestore conceptual paths under `federations/nowon-football`  

So Sprint design can be reviewed against **K3 gate** before any Implementation GO.

---

## 2. Design Principles

| # | Principle |
|---|---|
| P1 | `venues/{venueId}` answers **what/where** — not how much / when light / who booked |
| P2 | Money and rules that change over time live in **versioned policy entities** |
| P3 | Bookings store **`pricingSnapshot`** — historical amounts never silently reprice |
| P4 | Weather/disaster refunds are **operator-reviewed**, never auto-approved |
| P5 | Sample rates (27,500 / 35,750 / 35,750 / 11,000) are **one facility’s confirmed rule** — not defaults for all 8 |
| P6 | UNKNOWN_POLICY stays UNKNOWN — no invented numbers or auto-rules |
| P7 | Match-schedule usage of federation `venues` remains valid; rental OS must not corrupt match `venueId` contracts |
| P8 | Pure utilities from other domains may be considered later; SoT paths may not be shared |

---

## 3. Aggregate Map (conceptual SoT)

```text
federations/nowon-football
│
├─ venues/{venueId}                         # identity / profile
├─ venuePricingPolicies/{pricingPolicyId} # rates + effective window
├─ venueLightingSchedules/{scheduleId}    # monthly light windows[]
├─ venueAllocationRules/{ruleId}          # recurring fixed assignment
├─ venueBaselineAllocations/{allocationId} # dated XLSX/admin baseline occupancy (Sprint 2+)
├─ venueBookings/{bookingId}              # applications + snapshots
└─ venueRefundRequests/{refundRequestId}  # cancel/refund workflow
```

**Optional later (not contracted for Sprint 1):**  
`venueCalendarDays` / `venueSlots` as derived read models — do not invent yet.

**Additive (Sprint 2 contract extension — code path allowed; Production write of import rows = HOLD until PM Import GO):**  
`venueBaselineAllocations` — see §4.5A.

---

## 4. Entity Contracts (TypeScript)

Contract-only interfaces. Field optionality = design; required at write time TBD in Sprint GO.

### 4.1 Shared primitives

```ts
/** Tenant lock — do not resolve away from this id in rental domain */
export type NowonFederationId = "nowon-football";

export type VenueDocStatus = "active" | "inactive";

export type IsoDate = string;       // "YYYY-MM-DD"
export type YearMonth = string;     // "YYYY-MM"
export type ClockTime = string;     // "HH:mm" 24h local (Korea ops assumption)
export type MoneyKRW = number;      // integer won; engine outputs integers

export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

/** 1 = first week of month … ; exact calendar definition = UNKNOWN_POLICY until locked */
export type MonthWeekIndex = 1 | 2 | 3 | 4 | 5;
```

### 4.2 `venues` — identity / profile master

**Firestore path:** `federations/nowon-football/venues/{venueId}`

**Existing PROD seed (must KEEP):** `T1ScDcA01QOLxR9tjIbF` — 마들 스타디움

```ts
/**
 * PURPOSE: "이 구장이 무엇인가?"
 * FORBIDDEN on this doc: rate tables, monthly lighting, bookings[], refundPolicy
 */
export interface FederationVenue {
  /** Firestore document id */
  id: string;
  name: string;
  address?: string;
  fieldType?: string;
  status: VenueDocStatus;
  createdAt: unknown; // Firestore Timestamp
  updatedAt?: unknown;

  // Optional future profile extensions — NOT approved to write yet
  displayName?: string;
  description?: string;
  images?: string[];
  location?: { lat?: number; lng?: number };
  contact?: string; // prefer non-PII refs later
  amenities?: string[];
  capacity?: number;
  operatingStatus?: string;
  code?: string;
  outdoor?: boolean;
  bankAccountRef?: string;
  sortOrder?: number;
}
```

### 4.3 `venuePricingPolicies`

**Path:** `federations/nowon-football/venuePricingPolicies/{pricingPolicyId}`

```ts
export type PricingPolicyStatus = "draft" | "active" | "superseded" | "archived";

export interface VenuePricingPolicy {
  id: string;
  federationId: NowonFederationId;
  venueId: string;

  /** Inclusive start of applicability (booking date basis — precise rule TBD) */
  effectiveFrom: IsoDate;
  /** Exclusive or inclusive end — MUST be locked before Implementation GO */
  effectiveTo?: IsoDate | null;

  weekdayDaytimeRate: MoneyKRW;
  weekdayNighttimeRate: MoneyKRW;
  weekendHolidayRate: MoneyKRW;

  pricingUnit?: string;          // e.g. "hour" | "block_2h" — UNKNOWN until locked
  minimumDurationMinutes?: number;

  lightingHourlyRate: MoneyKRW;

  status: PricingPolicyStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdByUid?: string;
  notes?: string;
}
```

**Confirmed sample rates (ONE facility guidance — not 8-venue default):**

| Concept | Sample (KRW) | Contract use |
|---|---|---|
| Weekday daytime | 27,500 | Example only until per-venue policies exist |
| Weekday nighttime | 35,750 | Example only |
| Weekend / holiday | 35,750 | Example only |
| Lighting hourly | 11,000 | Example only; applies via overlap, not “night ⇒ light” |

### 4.4 `venueLightingSchedules`

**Path:** `federations/nowon-football/venueLightingSchedules/{scheduleId}`

Prefer `windows[]` over fixed morning/evening fields.

```ts
export interface LightingWindow {
  start: ClockTime;
  end: ClockTime;
  /** Optional label only — not a billing category */
  label?: "morning" | "evening" | "other" | string;
}

export type LightingScheduleStatus = "draft" | "active" | "archived";

export interface VenueLightingSchedule {
  id: string;
  federationId: NowonFederationId;
  venueId: string;

  /** Month this schedule applies to for operational sheets */
  yearMonth: YearMonth;

  windows: LightingWindow[]; // 0, 1, or many; empty = no lighting windows that month

  status: LightingScheduleStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  notes?: string;
}
```

**Examples (operational, not schema seed):**

- July: `[{ start: "20:00", end: "22:00" }]`  
- January: `[{ start: "06:00", end: "07:00" }, { start: "17:00", end: "22:00" }]`

### 4.5 `venueAllocationRules`

**Path:** `federations/nowon-football/venueAllocationRules/{allocationRuleId}`

```ts
export type AllocationRuleStatus = "active" | "paused" | "ended";

export interface VenueAllocationRule {
  id: string;
  federationId: NowonFederationId;
  venueId: string;

  /** Prefer opaque target until team SoT link locked */
  allocationTargetLabel: string;
  teamId?: string;

  dayOfWeek: Weekday;
  weekPattern: MonthWeekIndex[]; // e.g. [1, 3] = market weeks 1 & 3

  startTime: ClockTime;
  endTime: ClockTime;

  effectiveFrom?: IsoDate;
  effectiveTo?: IsoDate | null;

  status: AllocationRuleStatus;
  operatorNote?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
```

**UNKNOWN_POLICY:** fixed-team vs open-booking conflict priority.

### 4.5A `venueBaselineAllocations` — DATED BASELINE ALLOCATION (additive)

```text
WHY: Sprint 2 XLSX dry-run produced 235 canonical dated occupancy candidates
that are NOT requester bookings. Mapping them to REQUESTED / fake APPROVED
venueBookings invents requesterUid / team identity — PROHIBITED.

SEMANTIC: A dated venue slot already allocated in an approved operating source
(with provenance), without a proven YAGO requester/team stable identity.
Marks the canonical slot OCCUPIED for public "배정 완료" + blocks create/approve.

≠ venueAllocationRules (recurring memos / week-pattern rules)
≠ venueBookings workflow (REQUESTED|APPROVED|REJECTED|CANCELLED)

NAME-ONLY TEAM JOIN = PROHIBITED (preserve sourceAllocationLabel only)
QUARANTINE (non-canonical duration) = NO forced split / round / truncate
```

**Path:** `federations/nowon-football/venueBaselineAllocations/{allocationId}`

**Doc id (LOCKED, matches extract manifest):**  
`{federationId}__{venueId}__{YYYY-MM-DD}__{HHmmStart}__{HHmmEnd}`

```ts
export type VenueBaselineSourceType = "XLSX_BASELINE";
export type VenueBaselineOccupancyStatus = "OCCUPIED";

export interface VenueBaselineAllocation {
  id: string; // same as doc id
  federationId: NowonFederationId;
  venueId: string;
  bookingDate: IsoDate;
  startTime: ClockTime; // HH:mm
  endTime: ClockTime;

  sourceType: VenueBaselineSourceType;
  sourceAllocationLabel: string; // raw source text only — not a YAGO teamId join

  sourceFile: string;
  sourceSheet: string;
  sourceCell: string;

  status: VenueBaselineOccupancyStatus;
  importManifestVersion: string;
  createdAt?: unknown;
  importedAt?: unknown;
}
```

**Forbidden on this entity (unless independently proven later):**  
`requesterUid` · `requestingTeamId` · `requestingClubId` · invented `paymentStatus` · invented `pricingSnapshot`

**Canonical conflict identity (same as Sprint 1 bookings):**  
`federation + venueId + bookingDate + startTime + endTime`

**Occupancy / UI:** public slot merge → UI status `APPROVED` (label `배정 완료`); request disabled; no provenance/label on public surface by default.  
Admin may distinguish `BOOKING_REQUEST` vs `BASELINE_ALLOCATION` and may show label + safe provenance.

**Security:** requester create/update/delete DENY; federation manager trusted write only; catch-all must exclude this path (same harden pattern as `venueBookings`).

**C4 / D1–D4:** unchanged by this section.

### 4.6 `venueBookings`

**Path:** `federations/nowon-football/venueBookings/{bookingId}`

```ts
export type BookingApplicantType = "team" | "member" | "guest" | "operator" | "other";

/** D3 LOCK — keep minimal; do not add EXPIRED / NO_SHOW / etc. until ops evidence */
export type VenueBookingStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

/** D3 LOCK — booking approval ≠ payment confirmation */
export type VenuePaymentStatus = "UNCONFIRMED" | "CONFIRMED";

/**
 * D2 LOCK — quote/approve result MUST be breakdown, never total-only.
 * Do NOT assume 60-minute bookable slots from hourly unit arithmetic.
 */
export interface PricingBreakdown {
  durationMinutes: number;
  baseAmount: MoneyKRW;
  lightingOverlapMinutes: number;
  lightingAmount: MoneyKRW;
  totalAmount: MoneyKRW;

  pricingPolicyId: string;
  /** policy version id OR effectiveFrom/effectiveTo context string */
  pricingPolicyVersionOrEffectiveContext: string;
  lightingScheduleId?: string | null;

  calculationLines: string[]; // UI / receipt explainers

  engineVersion: string;
  quotedAt: string; // ISO datetime
}

/** Persisted copy of breakdown (+ rate inputs) so history never silently reprices */
export interface VenuePricingSnapshot extends PricingBreakdown {
  weekdayDaytimeRate: MoneyKRW;
  weekdayNighttimeRate: MoneyKRW;
  weekendHolidayRate: MoneyKRW;
  lightingHourlyRate: MoneyKRW;

  /** LOCKED Sprint-1: 2h policy unit (display/charge band) — not 1h invent */
  pricingUnitMinutes?: 120;
  /** LOCKED Sprint-1: minimum booking = 2 hours */
  minimumBookingMinutes?: 120;
  /** LOCKED Sprint-1: operating slot interval = 2 hours */
  slotIntervalMinutes?: 120;
}

export interface VenueBooking {
  id: string;
  federationId: NowonFederationId;
  venueId: string;

  bookingDate: IsoDate;
  startTime: ClockTime;
  endTime: ClockTime;

  applicantType: BookingApplicantType;
  applicantId?: string;
  teamId?: string;

  bookingStatus: VenueBookingStatus;
  paymentStatus: VenuePaymentStatus;

  pricingPolicyId: string;
  pricingSnapshot: VenuePricingSnapshot;

  baseAmount: MoneyKRW;
  lightingAmount: MoneyKRW;
  totalAmount: MoneyKRW;

  /** Optional link: rule ≠ concrete July-13 08:00 booking */
  allocationRuleId?: string | null;

  /**
   * DEFERRED — confirmation certificate / historical name-address freeze.
   * Not required for Sprint contract lock.
   */
  // venueSnapshot?: { name: string; address?: string; fieldType?: string };

  createdAt?: unknown;
  updatedAt?: unknown;
  createdByUid?: string;
  cancelledAt?: unknown;
  cancelReasonCategory?: RefundReasonCategory;
}
```

### 4.7 `venueRefundRequests`

**Path:** `federations/nowon-football/venueRefundRequests/{refundRequestId}`

```ts
export type RefundReasonCategory =
  | "GENERAL_CANCEL"
  | "WEATHER"
  | "DISASTER"
  | "OTHER";

/** D4 LOCK — minimal review statuses */
export type RefundReviewStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type RefundDecision = "full_refund" | "partial_refund" | "no_refund" | "pending";

/** D4 LOCK — Boolean facilityUsed is insufficient (false ≠ confirmed unused) */
export type FacilityUsageStatus = "UNKNOWN" | "NOT_USED" | "USED";

export interface VenueRefundRequest {
  id: string;
  federationId: NowonFederationId;
  bookingId: string;
  venueId: string;

  reasonCategory: RefundReasonCategory;
  usageStatus: FacilityUsageStatus;

  requestedAt: unknown;
  weatherContext?: string; // evidence threshold = UNKNOWN_POLICY

  reviewStatus: RefundReviewStatus;
  decision: RefundDecision;
  refundAmount?: MoneyKRW | null;

  reviewedAt?: unknown;
  reviewedByUid?: string;
  operatorNote?: string;
}
```

**Confirmed flow:**

```text
Booking
  → Cancellation requested
  → Refund request
  → Reason classification
  → Context / evidence
  → Operator review
  → Decision
  → Refund outcome
```

**Weather rule (D4 LOCK):**

```text
reasonCategory === WEATHER | DISASTER
  → reviewStatus starts UNDER_REVIEW (via REQUESTED)
  ≠ AUTO → APPROVED
```

### 4.8 General cancellation / refund (FEDERATION C4 LOCK v3)

**Operator:** Nowon Football Federation (Sprint 1 SoT)  
**Priority:** Weather/Disaster first (D4) — never auto-apply general tiers to WEATHER.

```text
Cancel / refund request
       │
       ▼
WEATHER | DISASTER?
       │
       ├─ YES → REVIEW_REQUIRED (operator)  [D4]
       │         usageStatus → review → APPROVED/REJECTED → refundAmount decided by operator
       │
       └─ NO  → GENERAL_CANCEL calendar-day engine below
```

#### Basis LOCK (critical)

```text
CANCELLATION TIER BASIS
= CALENDAR DAY DIFFERENCE (Asia/Seoul)

NOT
= EXACT HOUR DIFFERENCE (bookingStartAt - cancelAt)

DISCARDED ❌
  cancelledAt <= bookingStartAt - 24h → FULL_REFUND
```

```ts
/** Local calendar dates in Asia/Seoul */
daysBeforeUse = bookingLocalDate - cancellationLocalDate
// integer day difference; same calendar day of use → 0
```

**Why not 24h:** 이용 전날 취소 is **30% deduction**, even if wall-clock hours remaining ≥ 24.

Example: booking `2026-08-20 20:00`, cancel `2026-08-19 19:00` (= 25h wall-clock) → policy = **전날 = 2~1일 tier → 30% 공제**, not FULL_REFUND.

#### ADVANCE / SAME_DAY booking-type split — SUPERSEDED for general cancel amount

v2 `ADVANCE`/`SAME_DAY` hour rules for general-cancel **amount** are **replaced** by calendar-day tiers.  
(“예약/이용 당일 환불불가” = **이용 당일 취소** = `daysBeforeUse === 0` → NO_REFUND.)

#### GENERAL_CANCEL tiers — LOCKED

| `daysBeforeUse` | Tier | Deduction | Refund |
|---|---|---|---|
| ≥ 7 | `D7_PLUS` | 0% | 100% FULL |
| 6 … 3 | `D6_TO_D3` | 10% | 90% |
| 2 … 1 | `D2_TO_D1` | 30% | 70% |
| 0 (이용 당일) | `D0_DAY_OF_USE` | 100% | 0% NO_REFUND |
| < 0 (시작 이후 / past) | `AFTER_START` | 100% | 0% NO_REFUND |

Examples — use date `2026-08-20` (20:00~22:00):

| 취소 (KST date) | daysBeforeUse | 결과 |
|---|---|---|
| 8/10 | 10 | 전액 환불 |
| 8/15 | 5 | 10% 공제 → 90% |
| 8/18 | 2 | 30% 공제 → 70% |
| 8/19 | 1 (전날) | 30% 공제 → 70% |
| 8/20 | 0 (이용 당일) | 환불 불가 |

paidAmount example `82,500`:

| Tier | deductionAmount | refundAmount |
|---|---|---|
| D7_PLUS | 0 | 82,500 |
| D6_TO_D3 | 8,250 | 74,250 |
| D2_TO_D1 | 24,750 | 57,750 |
| D0 | — | 0 |

#### RefundBreakdown contract — LOCKED (no total-only)

```ts
export type CancellationPolicyTier =
  | "D7_PLUS"
  | "D6_TO_D3"
  | "D2_TO_D1"
  | "D0_DAY_OF_USE"
  | "AFTER_START";

export interface CancellationRefundBreakdown {
  paidAmount: number; // KRW integer — from booking payment snapshot
  bookingLocalDate: string; // YYYY-MM-DD Asia/Seoul
  cancellationLocalDate: string; // YYYY-MM-DD Asia/Seoul
  daysBeforeUse: number;
  policyTier: CancellationPolicyTier;
  deductionRate: 0 | 0.1 | 0.3 | 1;
  deductionAmount: number;
  refundAmount: number;
  reasonCategory: "GENERAL_CANCEL";
  reviewRequired: false;
  policyId: "FEDERATION_GENERAL_CANCEL_KST_DAY_TIER_V3";
  calculationLines: string[];
  timezone: "Asia/Seoul";
}

export interface CancellationRefundInput {
  paidAmount: number;
  bookingLocalDate: string; // Asia/Seoul date of use
  cancellationLocalDate: string; // Asia/Seoul date of cancel request
  /** If cancel is after booking start on day-of, tier AFTER_START */
  bookingStartAt?: string;
  cancelRequestedAt?: string;
}

/** MUST return Breakdown — total-only REJECTED */
export type CancellationRefundOutput = CancellationRefundBreakdown;
```

```text
Algorithm (conceptual)

days = bookingLocalDate - cancellationLocalDate   // KST dates

if days >= 7 → rate 0
else if days >= 3 → rate 0.1     // 6..3
else if days >= 1 → rate 0.3     // 2..1
else → rate 1                     // 0 = day of use (and <0 handled as no refund)

deductionAmount = floor/round policy TBD (U11 sibling) — Sprint default: integer KRW from exact % of paidAmount
refundAmount = paidAmount - deductionAmount
```

Rounding of `10%`/`30%` of odd won amounts: keep **UNKNOWN_POLICY U19** unless PM locks (recommend banker's or floor to won).

#### External facility corporation note

Previous confusion between “공단 7일 티어” and federation ops is **resolved for Sprint 1**:  
**Federation SoT = this KST day-tier table.**  
Any older “24h FULL_REFUND” draft and v2 SAME_DAY hour-eligible invent-100% path = **DISCARDED**.

#### Related Sprint-1 policy locks (same PM package)

| Topic | LOCK |
|---|---|
| Minimum booking | **2 hours** |
| Slot interval | **2 hours** |
| Base fee unit | **2-hour policy unit** (not 1h bookable by default) |
| Lighting | Monthly window **overlap** minutes × hourly rate |
| Unpaid auto-cancel (federation) | **없음** (manual / none) |
| Payment due | **사용 전월까지** 납부 |

---

## 5. Status Machines (contract) — D3 / D4 LOCK

### 5.1 Booking vs payment (separated) — 3-axis LOCK

```text
Axis A — allocation / booking
  requestStatus:  REQUESTED → ALLOCATED | NOT_ALLOCATED | WITHDRAWN | CANCELLED
  (legacy bookingStatus: REQUESTED → APPROVED | REJECTED → CANCELLED)

Axis B — payment
  paymentStatus:       UNCONFIRMED ↔ CONFIRMED     (admin only → CONFIRMED)
  paymentClaimStatus:  NONE | REQUESTED            (member 「입금 확인 요청」)
  PAYMENT_CLAIMED := claim=REQUESTED ∧ payment=UNCONFIRMED
  Member MUST NOT set paymentStatus=CONFIRMED

Axis C — final confirmation
  confirmStatus: PENDING_PAYMENT → FINALIZED       (admin; requires payment CONFIRMED)

FORBIDDEN: single linear enum REQUESTED→…→FINALIZED
```

Do **not** conflate `APPROVED`/`ALLOCATED` with deposit paid.  
Do **not** add unpaid auto-cancel (Q4 LOCK).  
PS5 detail: `docs/YAGO_NOWON_VENUE_PAYMENT_SIGNAL_AND_CONFIRM_DESIGN.md`.

### 5.2 Refund

```text
REQUESTED → UNDER_REVIEW → APPROVED | REJECTED
```

Reason category and review status remain independent fields.

---

## 6. Domain Engine Contracts (pure I/O)

Engines are **pure functions** (implementation HOLD). No Firestore side effects in engine contracts.

### 6.1 Lighting overlap engine

```ts
export interface LightingOverlapInput {
  bookingStart: ClockTime;
  bookingEnd: ClockTime;
  windows: LightingWindow[];
}

export interface LightingOverlapOutput {
  /** Total minutes booking overlaps any lighting window */
  overlapMinutes: number;
  /** overlapMinutes / 60 — may be fractional; billing rounding = UNKNOWN_POLICY */
  overlapHours: number;
  segments: Array<{ start: ClockTime; end: ClockTime; minutes: number }>;
}
```

**Confirmed example:** July booking 19:00–21:00 ∩ window 20:00–22:00 → **1h** × lighting hourly rate.

**NOT:** night booking automatically implies lighting charge without window overlap.

### 6.2 Base pricing engine

```ts
export interface BasePricingInput {
  bookingDate: IsoDate;
  startTime: ClockTime;
  endTime: ClockTime;
  policy: VenuePricingPolicy;
  /** Holiday calendar authority = UNKNOWN_POLICY — inject resolved flag */
  isHoliday: boolean;
  /**
   * D2 LOCK — Sprint-1: unit / minimum / slot interval = 120 minutes.
   * Do not invent 60-minute bookable slots from hourly arithmetic.
   */
  pricingUnitMinutes?: 120;
  minimumBookingMinutes?: 120;
  slotIntervalMinutes?: 120;}

export interface BasePricingOutput {
  durationMinutes: number;
  baseAmount: MoneyKRW;
  appliedBand: "weekday_day" | "weekday_night" | "weekend_holiday" | "mixed" | "unknown";
  calculationLines: string[];
}
```

**UNKNOWN / LOCK:** day/night cutoff; mixed-band split; holiday source; **1-hour bookable assumption PROHIBITED**.

### 6.3 Quote engine (compose) — D2 LOCK

```ts
export interface VenueQuoteInput {
  federationId: NowonFederationId;
  venueId: string;
  bookingDate: IsoDate;
  startTime: ClockTime;
  endTime: ClockTime;
  policy: VenuePricingPolicy;
  lightingSchedule: VenueLightingSchedule | null;
  isHoliday: boolean;
  engineVersion: string;
}

/** MUST return PricingBreakdown — total-only REJECTED */
export type VenueQuoteOutput = PricingBreakdown & {
  lightingOverlap: LightingOverlapOutput;
  base: BasePricingOutput;
};
```

On APPROVED (or quote accept), persist full `pricingSnapshot` (extends breakdown) onto `venueBookings` — **never recompute historical amounts from live policy**.

Example (illustrative only — sample rates, not 8-venue default):

```text
Sat Jul · 19:00–21:00
durationMinutes: 120
baseAmount: 71500          // weekend · 2h
lightingOverlapMinutes: 60 // ∩ 20:00–22:00
lightingAmount: 11000
totalAmount: 82500
calculationLines:
  - 주말/공휴일 기본요금 2시간
  - 조명 사용 1시간
```

### 6.4 Allocation conflict (stub — UNKNOWN priority)

```ts
export interface AllocationConflictInput {
  venueId: string;
  bookingDate: IsoDate;
  startTime: ClockTime;
  endTime: ClockTime;
  rules: VenueAllocationRule[];
  existingBookings: Array<
    Pick<VenueBooking, "id" | "startTime" | "endTime" | "bookingStatus">
  >;
}

export interface AllocationConflictOutput {
  conflicts: Array<{
    kind: "allocation_rule" | "booking";
    refId: string;
    note?: string;
  }>;
  /** Must remain false until PRIORITY policy locked */
  autoResolved: false;
}
```

### 6.5 Sprint 3 Phase B — Approved pricing / lighting policy baseline (PM 2026-07-15)

**Code SoT (estimate engine):** `src/lib/federation/venuePricingPolicyLock.ts` + `venuePricingEngine.ts`  
**Report:** `docs/YAGO_NOWON_VENUE_RENTAL_SPRINT3_PHASE_B_PRICING_ENGINE.md`  
**Partial lock history:** `docs/YAGO_NOWON_VENUE_RENTAL_SPRINT3_PHASE_A_PARTIAL_PRICING_CONTRACT_LOCK.md`

#### Venue-specific base pricing

| Venue id | Model | Policy |
|---|---|---|
| `nowon-suraksan` | TIME_CALENDAR_TIERED | weekday day 27,500 / night from 18:00 35,750; Sat·Sun·공휴일 rate 35,750 · **+ lighting** |
| `nowon-gyeonggonggo` | FLAT_HOURLY | 30,000 / hour all bands · no lighting |
| `nowon-yuksa` | WEEKEND_ONLY_CONFIRMED | weekend **35,750 / hour**; weekday UNKNOWN (no invent); **no lighting**. XLSX 39,325 vs 38,325 = provenance only |
| `nowon-hanjeon` | FLAT_HOURLY | 35,750 / hour all bands · no lighting |
| `T1ScDcA01QOLxR9tjIbF` (마들) | UNKNOWN base | lighting applicable |
| `nowon-choansan` | UNKNOWN base | lighting applicable |
| `nowon-buramsan` | UNKNOWN base | lighting applicable |
| `nowon-kwagidae` | UNKNOWN base | lighting **not** applicable |

**UNKNOWN / CONFLICT / weekday-unsupported:** never invent baseFee; never average conflicts; lighting-known alone must not fabricate `totalFee`.

#### Lighting

```text
rate = 11,000 KRW / hour
venues (exactly 4) = 수락산 · 불암산 · 마들 · 초안산
NOT = 경기공고 · 육사 · 한전 · 과기대
trigger = booking interval ∩ month lighting.windows[]
fixed 18:00 lighting cutoff = FORBIDDEN
actual-use toggle = FORBIDDEN
Suraksan nighttime base 35,750 ≠ lighting inclusive (components add)
```

Monthly `windows[]` (local clock, [start,end)):

```text
JAN 06–07 · 17–22
FEB 06–07 · 18–22
MAR 06–07 · 18–22
APR 19–22
MAY 19–22
JUN 20–22
JUL 20–22
AUG 20–22
SEP 19–22
OCT 06–07 · 18–22
NOV 06–08 · 17–22
DEC 06–08 · 17–22
```

#### Suraksan weekday split (base fee, not lighting)

```text
weekday 17:00–19:00 → 17–18 @ 27,500 + 18–19 @ 35,750 = 63,250
```

#### Holiday calendar

```text
U7 Holiday calendar authority = still UNKNOWN in repo
PM holiday RATE for Suraksan = 35,750 LOCKED
Auto public-holiday day identity = HOLIDAY_CALENDAR_SOURCE_REQUIRED
Do not hardcode guessed Korean holiday dates
Optional isHoliday inject for tests / future trusted source only
```

#### Estimate vs final payment

```text
Phase B calculator output = ESTIMATE
≠ PAID · FINAL_SETTLEMENT · CONFIRMED_PAYMENT

Runtime booking create (Sprint 1 preserved):
  pricingSnapshot = null
  baseAmount/lightingAmount/totalAmount = 0
  client must NOT inject pricingSnapshot (rules preservation)

BOOKING_PRICING_SNAPSHOT_CONTRACT_GAP
  = typed secure persist of estimate snapshot not authorized in Phase B
  (no Firestore rules weaken; no Production write)
```

#### Quote status semantics (engine)

| status | Meaning |
|---|---|
| CALCULATED | base + lighting (incl. N/A=0) resolved; total present |
| PARTIAL | e.g. lighting calculable, base confirmation required; total null |
| PRICE_CONFIRMATION_REQUIRED | base unknown/conflict (and no fake total) |

---

## 7. Field Belonging Matrix

| Concept | `venues` | Pricing | Lighting | Allocation | Booking | Refund |
|---|---|---|---|---|---|---|
| Name / address / status | ✅ | | | | | |
| Rates + effectiveFrom/To | ❌ | ✅ | | | | |
| Monthly light windows[] | ❌ | | ✅ | | | |
| Fixed week pattern (1,3) | ❌ | | | ✅ | | |
| Applicant + amounts + snapshot | ❌ | | | | ✅ | |
| Weather review decision | ❌ | | | | | ✅ |

---

## 8. Compatibility with existing Production venue

| Item | Contract |
|---|---|
| Keep `T1ScDcA01QOLxR9tjIbF` | YES — seed identity |
| Preserve match-admin fields | YES — `name`, `address`, `fieldType`, `status`, `createdAt` |
| Inline rates into venue | **NO** |
| Rename / migrate collection | **NO** at this phase |
| Additional 7 venues | Create as additional `venues` docs only after Implementation GO + registry inventory |

---

## 9. Explicit exclusions

| Item | Status |
|---|---|
| Firestore collection creation | FORBIDDEN until Implementation GO |
| `/venues` routes / UI | HOLD (route family previously PM-approved for **future**) |
| Resolver wiring | FORBIDDEN |
| Merge/migrate to `nowon-gu-football` | NO |
| Writes to `assoc-nowon-football` for venue OS | PROHIBITED |
| `/app/facility` path reuse | DO_NOT_REUSE |
| Auto weather refund | FORBIDDEN |
| Copy sample rates to all 8 venues | FORBIDDEN |
| Invent UNKNOWN_POLICY numbers | FORBIDDEN |

---

## 10. UNKNOWN_POLICY Register (do not invent)

| ID | Topic |
|---|---|
| U1 | **LOCKED C4 v3** KST calendar-day tiers (7+/6–3/2–1/0). 24h hour-cutoff DISCARDED. External hour rules N/A for federation SoT |
| U2 | Cancellation deadline tiers beyond C4 binary (none for federation Sprint 1) |
| U3 | Payment deadline |
| U4 | Unpaid auto-cancel (admin manual vs system) |
| U5 | Open booking vs fixed allocation priority |
| U6 | Weather evidence threshold |
| U7 | Holiday calendar authority / source — **Suraksan holiday RATE locked 35,750**; day-identity auto = `HOLIDAY_CALENDAR_SOURCE_REQUIRED` until trusted util/package approved |
| U8 | Bank payment matching |
| U9 | Day/night time boundary for base rates |
| U10 | Mixed-band booking pricing split |
| U11 | Lighting hour rounding (ceil/floor/exact) |
| U12 | Full per-venue rate tables for all 8 grounds |
| U13 | `effectiveTo` inclusive vs exclusive |
| U14 | Month week index calendar definition |
| U15 | **minimumBookingMinutes** — **LOCKED 120** (Sprint-1) |
| U16 | **pricingUnitMinutes** — **LOCKED 120** (Sprint-1; 2h display ≠ invent 1h bookable) |
| U17 | **slotIntervalMinutes** — **LOCKED 120** (Sprint-1) |
| U18 | Asia/Seoul calendar-date boundary for daysBeforeUse (implement detail) |
| U19 | Deduction rounding to KRW for 10%/30% of odd paidAmount |

**Sprint-1 ask set (human):** §13 — only four operator questions; do not reopen full design.

---

## 11. Relationship to prior docs

| Doc | Role after this design |
|---|---|
| `YAGO_NOWON_VENUE_RENTAL_ATTACHMENT_DESIGN.md` | Attachment / routes — **tenant id portion superseded** by `nowon-football` lock |
| `YAGO_FEDERATION_TENANT_IDENTITY_P0_AUDIT.md` | Code identity audit — accepted |
| `YAGO_FEDERATION_PROD_TENANT_INVENTORY.md` | Prod STATE — accepted; KEEP lock |
| `YAGO_NOWON_EXISTING_VENUE_SCHEMA_P0_AUDIT.md` | Schema class — accepted |

---

## 12. Suggested Sprint split (planning only — not GO)

| Sprint | Scope (when Implementation unlocked) |
|---|---|
| S0 | Answer §13 four questions + K3 gate |
| S1 | `venues` registry (≤8) + read; quote engine with PricingBreakdown |
| S2 | Pricing + lighting policies CRUD |
| S3 | Allocation rules + booking REQUESTED/APPROVED + paymentStatus |
| S4 | Refund REQUESTED→UNDER_REVIEW→decision |

**Not started.**

---

## 13. D1–D4 + C4 LOCK Record + Remaining Human Gates

### PM LOCK (2026-07-15) — CLOSED for Cursor design expansion

`	ext
D1 ENTITY BOUNDARIES     = APPROVED 🔒
D2 PRICING BREAKDOWN     = APPROVED 🔒  (TOTAL-ONLY REJECTED; default 2h; see Booking policy extension)
D3 BOOKING ≠ PAYMENT     = APPROVED 🔒
D4 REFUND REVIEW         = APPROVED 🔒  (WEATHER auto-approve PROHIBITED; UsageStatus tri-state)
C4 GENERAL CANCEL (FED)  = APPROVED 🔒 v3
     BASIS               = Asia/Seoul CALENDAR DAY (not hour cutoff)
     days≥7              = FULL_REFUND (0% 공제)
     days 6..3           = 10% 공제 → 90% 환불
     days 2..1 (incl 전날)= 30% 공제 → 70% 환불
     days 0 (이용 당일)   = NO_REFUND
     24h hour-cutoff     = DISCARDED ❌
     RefundBreakdown     = REQUIRED
P_MIN / SLOT            = 2h LOCKED (default)
P_PAY                   = 사용 전월까지; unpaid auto-cancel = NONE
DOMAIN CONTRACT          = PM APPROVED
IMPLEMENTATION           = STILL HOLD 🔒
```

### Booking policy extension (PM APPROVED 2026-07-27 — P0/P1)

```text
DEFAULT SLOT POLICY     = 2h LOCKED (field missing / invalid → 120min fallback)
                          Nowon: slotInterval=120, min=120, max=120
SLOT vs LENGTH          = SEPARATED 🔒
                          slotIntervalMinutes (60|120) = grid unit
                          min/maxBookingMinutes       = request length (hour-based;
                          independent; e.g. 60/120/180/240…)
                          defaultBookingMinutes       = CMS/future apply default
                          (must be an allowed length; Nowon default = 120)
                          Allowed lengths = [min..max] ∩ multiples of slotInterval
                          → supports 2h OR 3h on 1h grid (e.g. 19–21, 19–22)
1h GRID                 = NOT globally unlocked
                          Allowed ONLY when venues/{venueId}.bookingPolicy
                          has valid slotIntervalMinutes: 60 AND
                          Platform/Federation admin explicitly saved it
NOWON OPERATING         = remains 2h until venue policy explicitly changed
SLOT GRID SoT           = buildSlotsFromPolicy(effective bookingPolicy)
                          CMS preview · admin board · quick allocate · public apply
                          (overlap display + allocate write-check enabled)
CONSECUTIVE MULTI-SLOT  = schema prepared; apply path NOT activated (P0/P1)
                          Required for length > slotInterval (e.g. 3h on 1h grid)
ALLOW HOURLY START      = CMS preview only until overlap validator on apply
```

### Operator questions (Sprint 1 — ask ops)

| # | Question | Status |
|---|---|---|
| Q1 | 대관 최소/슬롯 단위? | **LOCKED default 2시간**; per-venue `bookingPolicy` may set 60 only after P2 gate |
| Q2 | 일반 취소 환불 기준? | **LOCKED C4 v3** — KST day tiers 7+/6–3/2–1/0 |
| Q3 | 승인 후 입금 기한? | **LOCKED** — 사용 전월까지 |
| Q4 | 미입금 자동 취소? | **LOCKED** — 없음 (협회) |
| Q5 | (v2) 당일예약 시작 전 전액? | **N/A** — superseded by v3 day tiers |

### Product gate

```text
K3 gate allows new implement?
  = unresolved in this document — PM / checklist SoT
```

---

## Final Status

```text
DOMAIN CONTRACT PM APPROVED ✅
D1–D4 + C4 v3 (KST day tiers): LOCKED 🔒; 24h cutoff DISCARDED
P0 AUDIT: CLOSED ✅
IMPLEMENTATION: HOLD 🔒
No further design docs unless PM reopens
COMPLETE (product feature): not declared
```

### One-line

> **일반 취소는 KST 이용일 기준 7+/6–3/2–1/0 공제 tier로 LOCK, 24시간 시각 규칙은 폐기, 기상은 별도 검토 — 구현 HOLD.**
