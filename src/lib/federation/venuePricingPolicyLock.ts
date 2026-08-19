/**
 * Nowon Venue Rental — Sprint 3 Phase B locked pricing / lighting policy.
 * PM GO 2026-07-15 (+ lighting 4-venue / Yuksa weekend-only corrections).
 * Source of truth for calculator constants (not Firestore seed).
 */

export const VENUE_PRICING_ENGINE_VERSION = "nowon-venue-pricing-v1.1" as const;
export const VENUE_PRICING_POLICY_ID = "nowon-phase-b-lock-v1.1" as const;

/** No trusted Korean holiday calendar in repo — do not invent dates. */
export const HOLIDAY_CALENDAR_SOURCE_REQUIRED = "HOLIDAY_CALENDAR_SOURCE_REQUIRED" as const;

export const NOWON_VENUE_IDS = {
  SURAKSAN: "nowon-suraksan",
  GYEONGGONGGO: "nowon-gyeonggonggo",
  YUKSA: "nowon-yuksa",
  HANJEON: "nowon-hanjeon",
  MADEUL: "T1ScDcA01QOLxR9tjIbF",
  CHOANSAN: "nowon-choansan",
  BURAMSAN: "nowon-buramsan",
  KWAGIDAE: "nowon-kwagidae",
} as const;

export type NowonVenueId = (typeof NOWON_VENUE_IDS)[keyof typeof NOWON_VENUE_IDS];

export type BasePricingModel =
  | "FLAT_HOURLY"
  | "TIME_CALENDAR_TIERED"
  | "WEEKEND_ONLY_CONFIRMED"
  | "UNKNOWN"
  | "CONFLICTING";

export type LockedFlatPolicy = {
  model: "FLAT_HOURLY";
  flatHourlyRate: number;
};

export type LockedSuraksanPolicy = {
  model: "TIME_CALENDAR_TIERED";
  weekdayDayRatePerHour: number;
  weekdayNightRatePerHour: number;
  weekendRatePerHour: number;
  /** PM-confirmed amount; auto day identity still needs holiday calendar */
  holidayRatePerHour: number;
  /** Weekday day→night split for base fee (not lighting) */
  nightCutoffHhmm: "18:00";
};

export type LockedWeekendOnlyPolicy = {
  model: "WEEKEND_ONLY_CONFIRMED";
  weekendHourlyRate: number;
  /** Weekday automatic base calculation prohibited */
  weekdayRate: "UNKNOWN";
};

export type LockedUnknownBasePolicy = {
  model: "UNKNOWN";
};

export type LockedConflictBasePolicy = {
  model: "CONFLICTING";
  conflictNote: string;
};

export type LockedBasePolicy =
  | LockedFlatPolicy
  | LockedSuraksanPolicy
  | LockedWeekendOnlyPolicy
  | LockedUnknownBasePolicy
  | LockedConflictBasePolicy;

/**
 * Lighting applies to exactly these 4 venues (PM correction 2026-07-15).
 * NOT: 경기공고 · 육사 · 한전 · 과기대
 */
export const LIGHTING_APPLICABLE_VENUE_IDS: ReadonlySet<string> = new Set([
  NOWON_VENUE_IDS.SURAKSAN,
  NOWON_VENUE_IDS.BURAMSAN,
  NOWON_VENUE_IDS.MADEUL,
  NOWON_VENUE_IDS.CHOANSAN,
]);

export const LIGHTING_HOURLY_RATE_KRW = 11_000 as const;

/** Month 1–12 → local clock windows [start,end) in HH:mm */
export const LIGHTING_MONTHLY_WINDOWS: Readonly<
  Record<number, ReadonlyArray<{ start: string; end: string }>>
> = {
  1: [
    { start: "06:00", end: "07:00" },
    { start: "17:00", end: "22:00" },
  ],
  2: [
    { start: "06:00", end: "07:00" },
    { start: "18:00", end: "22:00" },
  ],
  3: [
    { start: "06:00", end: "07:00" },
    { start: "18:00", end: "22:00" },
  ],
  4: [{ start: "19:00", end: "22:00" }],
  5: [{ start: "19:00", end: "22:00" }],
  6: [{ start: "20:00", end: "22:00" }],
  7: [{ start: "20:00", end: "22:00" }],
  8: [{ start: "20:00", end: "22:00" }],
  9: [{ start: "19:00", end: "22:00" }],
  10: [
    { start: "06:00", end: "07:00" },
    { start: "18:00", end: "22:00" },
  ],
  11: [
    { start: "06:00", end: "08:00" },
    { start: "17:00", end: "22:00" },
  ],
  12: [
    { start: "06:00", end: "08:00" },
    { start: "17:00", end: "22:00" },
  ],
};

export const LOCKED_BASE_POLICIES: Readonly<Record<string, LockedBasePolicy>> = {
  [NOWON_VENUE_IDS.SURAKSAN]: {
    model: "TIME_CALENDAR_TIERED",
    weekdayDayRatePerHour: 27_500,
    weekdayNightRatePerHour: 35_750,
    weekendRatePerHour: 35_750,
    holidayRatePerHour: 35_750,
    nightCutoffHhmm: "18:00",
  },
  [NOWON_VENUE_IDS.GYEONGGONGGO]: {
    model: "FLAT_HOURLY",
    flatHourlyRate: 30_000,
  },
  // Operator: weekend-only rental · 35,750/h · no lighting.
  // Unrestricted FLAT_HOURLY interpretation SUPERSEDED (PM 2026-07-15).
  // XLSX 39325 vs 38325 = provenance CONFLICT only.
  [NOWON_VENUE_IDS.YUKSA]: {
    model: "WEEKEND_ONLY_CONFIRMED",
    weekendHourlyRate: 35_750,
    weekdayRate: "UNKNOWN",
  },
  [NOWON_VENUE_IDS.HANJEON]: {
    model: "FLAT_HOURLY",
    flatHourlyRate: 35_750,
  },
  [NOWON_VENUE_IDS.MADEUL]: { model: "UNKNOWN" },
  [NOWON_VENUE_IDS.CHOANSAN]: { model: "UNKNOWN" },
  [NOWON_VENUE_IDS.BURAMSAN]: { model: "UNKNOWN" },
  [NOWON_VENUE_IDS.KWAGIDAE]: { model: "UNKNOWN" },
};

export function getLockedBasePolicy(venueId: string): LockedBasePolicy {
  return LOCKED_BASE_POLICIES[venueId] ?? { model: "UNKNOWN" };
}

export function isLightingApplicableVenue(venueId: string): boolean {
  return LIGHTING_APPLICABLE_VENUE_IDS.has(venueId);
}

/** Historical XLSX-only finding — not active calculator input. */
export const YUKSA_XLSX_EVIDENCE_PROVENANCE = {
  status: "CONFLICTING" as const,
  observedHourlyCandidates: [39_325, 38_325] as const,
  note:
    "XLSX evidence CONFLICT preserved as provenance; ACTIVE CONTRACT = WEEKEND_ONLY 35750, no lighting",
} as const;

export const YUKSA_OPERATOR_ACTIVE_CONTRACT = {
  model: "WEEKEND_ONLY_CONFIRMED" as const,
  weekendHourlyRate: 35_750,
  lightingApplicable: false,
  operatorStatement:
    "육사구장은 주말만 대관해서 1시간 35,750원 라이트가 없어서 라이트 비용이 발생하지 않습니다.",
} as const;
