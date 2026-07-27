/**
 * Venue booking policy — slot grid + booking length per venue.
 *
 * Slot SoT for all UIs: buildSlotsFromPolicy(effectivePolicy)
 * (CMS preview, admin board, quick allocate, public apply).
 *
 * Design (PM):
 * - slotIntervalMinutes = grid / consecutive unit (60 | 120)
 * - min/maxBookingMinutes = allowed request length (independent of interval)
 * - defaultBookingMinutes = CMS / apply default length (must be allowed)
 * - Default (missing/invalid) === Nowon legacy 2h SoT (120/120/120/120)
 */

export type VenueSlotIntervalMinutes = 60 | 120;

/** Booking length is expressed in whole hours (independent of slot interval). */
export const BOOKING_DURATION_UNIT_MINUTES = 60 as const;

/** CMS / validation ceiling for a single request (12h). */
export const BOOKING_DURATION_MAX_CAP_MINUTES = 720 as const;

/** Common CMS choices for min/max/default booking length. */
export const BOOKING_DURATION_CHOICES_MINUTES = [
  60, 120, 180, 240, 300, 360, 420, 480,
] as const;

/** Hour labels for dayStart/dayEnd CMS dropdowns (on-the-hour). */
export const OPERATING_HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  String(h).padStart(2, "0")
);

export type VenueBookingPolicy = {
  schemaVersion: 1;
  /**
   * Grid / consecutive slot unit (minutes).
   * Controls start-time steps (with allowHourlyStart) and which durations
   * are achievable (must be a multiple of this interval).
   */
  slotIntervalMinutes: VenueSlotIntervalMinutes;
  /**
   * Minimum single-request duration (minutes).
   * Independent of slotInterval — typically 60 | 120 | 180 | 240 …
   */
  minBookingMinutes: number;
  /**
   * Maximum single-request duration (minutes).
   * Independent of slotInterval — typically 120 | 180 | 240 | 360 …
   */
  maxBookingMinutes: number;
  /**
   * Default duration preselected in CMS / future apply UI.
   * Must be an allowed duration (min~max ∩ multiples of slotInterval).
   */
  defaultBookingMinutes: number;
  /**
   * false: starts every `slotIntervalMinutes` from dayStart (06,08,10…).
   * true: starts every hour; each grid cell still lasts `slotIntervalMinutes`
   *       (e.g. 2h → 06–08, 07–09, 08–10).
   */
  allowHourlyStart: boolean;
  /**
   * Future: multi-slot request in one document (start/end + selectedSlotIds[]).
   * Required for booking length > slotInterval (e.g. 3h on 1h grid).
   * P0/P1: stored in CMS only — not used by public apply.
   */
  allowConsecutiveSlots: boolean;
  dayStart: string;
  dayEnd: string;
  updatedAt?: unknown;
  updatedByUid?: string;
};

/** Persistable snapshot for history (no Firestore Timestamp objects). */
export type VenueBookingPolicySnapshot = {
  schemaVersion: 1;
  slotIntervalMinutes: VenueSlotIntervalMinutes;
  minBookingMinutes: number;
  maxBookingMinutes: number;
  defaultBookingMinutes: number;
  allowHourlyStart: boolean;
  allowConsecutiveSlots: boolean;
  dayStart: string;
  dayEnd: string;
};

export type VenueBookingPolicyChangeField =
  | "slotIntervalMinutes"
  | "minBookingMinutes"
  | "maxBookingMinutes"
  | "defaultBookingMinutes"
  | "allowHourlyStart"
  | "allowConsecutiveSlots"
  | "dayStart"
  | "dayEnd";

export type VenueBookingPolicyFieldChange = {
  field: VenueBookingPolicyChangeField;
  from: string;
  to: string;
};

export type VenueBookingPolicyHistoryEntry = {
  id: string;
  venueId: string;
  changedByUid: string;
  changedByName?: string;
  before: VenueBookingPolicySnapshot;
  after: VenueBookingPolicySnapshot;
  changes: VenueBookingPolicyFieldChange[];
  createdAt?: unknown;
};

/** PM-approved Nowon / legacy fallback — must match buildTwoHourSlots() output. */
export const DEFAULT_VENUE_BOOKING_POLICY: VenueBookingPolicy = {
  schemaVersion: 1,
  slotIntervalMinutes: 120,
  minBookingMinutes: 120,
  maxBookingMinutes: 120,
  defaultBookingMinutes: 120,
  allowHourlyStart: false,
  allowConsecutiveSlots: false,
  dayStart: "06:00",
  dayEnd: "22:00",
};

export type VenueBookingPolicyPreviewSlot = {
  startTime: string;
  endTime: string;
  /** HHMM for future selectedSlotIds[] */
  slotId: string;
};

export type VenueBookingPolicyValidation =
  | { ok: true; policy: VenueBookingPolicy }
  | { ok: false; errors: string[]; fallback: VenueBookingPolicy };

const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const FIELD_LABELS: Record<VenueBookingPolicyChangeField, string> = {
  slotIntervalMinutes: "슬롯 간격",
  minBookingMinutes: "최소 예약",
  maxBookingMinutes: "최대 예약",
  defaultBookingMinutes: "기본 예약",
  allowHourlyStart: "매시 시작",
  allowConsecutiveSlots: "연속 예약",
  dayStart: "운영 시작",
  dayEnd: "운영 종료",
};

export function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export function minutesToClock(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hourFromClock(hhmm: string): string {
  return hhmm.slice(0, 2);
}

export function clockFromHour(hour: string): string {
  const h = String(Math.max(0, Math.min(23, parseInt(hour, 10) || 0))).padStart(2, "0");
  return `${h}:00`;
}

export function slotIdFromStart(startTime: string): string {
  return startTime.replace(":", "");
}

export function formatDurationHours(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  if (minutes % 60 === 0) return `${minutes / 60}시간`;
  return `${minutes}분`;
}

export function policyFieldLabel(field: VenueBookingPolicyChangeField): string {
  return FIELD_LABELS[field];
}

/** Interval overlap — required before P2 activates hourly / 1h grids. */
export function intervalsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return clockToMinutes(aStart) < clockToMinutes(bEnd) && clockToMinutes(bStart) < clockToMinutes(aEnd);
}

function isValidClock(v: unknown): v is string {
  return typeof v === "string" && CLOCK_RE.test(v);
}

function isMultipleOf(value: number, unit: number): boolean {
  return unit > 0 && value > 0 && value % unit === 0;
}

/**
 * Allowed request lengths under a policy.
 * Lengths are hour-based in [min, max], but must also be multiples of
 * slotIntervalMinutes (achievable by N consecutive grid slots).
 */
export function listAllowedBookingDurations(
  policy: Pick<VenueBookingPolicy, "slotIntervalMinutes" | "minBookingMinutes" | "maxBookingMinutes">
): number[] {
  const step = policy.slotIntervalMinutes;
  if (step <= 0) return [];
  const first = Math.ceil(policy.minBookingMinutes / step) * step;
  const out: number[] = [];
  for (let m = first; m <= policy.maxBookingMinutes; m += step) {
    out.push(m);
  }
  return out;
}

function resolveDefaultBookingMinutes(
  rawDefault: unknown,
  allowed: number[],
  minBookingMinutes: number
): number {
  if (typeof rawDefault === "number" && Number.isFinite(rawDefault) && allowed.includes(Math.floor(rawDefault))) {
    return Math.floor(rawDefault);
  }
  if (allowed.includes(minBookingMinutes)) return minBookingMinutes;
  return allowed[0] ?? minBookingMinutes;
}

export function toVenueBookingPolicySnapshot(policy: VenueBookingPolicy): VenueBookingPolicySnapshot {
  return {
    schemaVersion: 1,
    slotIntervalMinutes: policy.slotIntervalMinutes,
    minBookingMinutes: policy.minBookingMinutes,
    maxBookingMinutes: policy.maxBookingMinutes,
    defaultBookingMinutes: policy.defaultBookingMinutes,
    allowHourlyStart: policy.allowHourlyStart,
    allowConsecutiveSlots: policy.allowConsecutiveSlots,
    dayStart: policy.dayStart,
    dayEnd: policy.dayEnd,
  };
}

function formatFieldValue(field: VenueBookingPolicyChangeField, value: unknown): string {
  switch (field) {
    case "slotIntervalMinutes":
    case "minBookingMinutes":
    case "maxBookingMinutes":
    case "defaultBookingMinutes":
      return formatDurationHours(Number(value));
    case "allowHourlyStart":
    case "allowConsecutiveSlots":
      return value ? "ON" : "OFF";
    case "dayStart":
    case "dayEnd":
      return String(value ?? "—");
    default:
      return String(value ?? "—");
  }
}

/** Diff two snapshots for history UI. */
export function diffVenueBookingPolicy(
  before: VenueBookingPolicySnapshot,
  after: VenueBookingPolicySnapshot
): VenueBookingPolicyFieldChange[] {
  const fields: VenueBookingPolicyChangeField[] = [
    "slotIntervalMinutes",
    "minBookingMinutes",
    "maxBookingMinutes",
    "defaultBookingMinutes",
    "allowHourlyStart",
    "allowConsecutiveSlots",
    "dayStart",
    "dayEnd",
  ];
  const changes: VenueBookingPolicyFieldChange[] = [];
  for (const field of fields) {
    if (before[field] !== after[field]) {
      changes.push({
        field,
        from: formatFieldValue(field, before[field]),
        to: formatFieldValue(field, after[field]),
      });
    }
  }
  return changes;
}

/**
 * Normalize unknown Firestore / form input.
 * Invalid → ok:false + DEFAULT fallback (never invent 60 without explicit valid interval).
 * Missing defaultBookingMinutes → inferred from allowed durations (compat with older docs).
 */
export function validateVenueBookingPolicy(raw: unknown): VenueBookingPolicyValidation {
  const errors: string[] = [];
  if (raw == null || typeof raw !== "object") {
    return { ok: false, errors: ["bookingPolicy 없음"], fallback: { ...DEFAULT_VENUE_BOOKING_POLICY } };
  }
  const o = raw as Record<string, unknown>;

  const intervalRaw = o.slotIntervalMinutes;
  let slotIntervalMinutes: VenueSlotIntervalMinutes | null = null;
  if (intervalRaw === 60 || intervalRaw === 120) {
    slotIntervalMinutes = intervalRaw;
  } else {
    errors.push("slotIntervalMinutes는 60 또는 120만 허용");
  }

  const dayStart = isValidClock(o.dayStart) ? o.dayStart : null;
  const dayEnd = isValidClock(o.dayEnd) ? o.dayEnd : null;
  if (!dayStart) errors.push("dayStart 형식 오류 (HH:mm)");
  if (!dayEnd) errors.push("dayEnd 형식 오류 (HH:mm)");
  if (dayStart && dayEnd && clockToMinutes(dayStart) >= clockToMinutes(dayEnd)) {
    errors.push("dayStart < dayEnd 이어야 함");
  }

  const minBookingMinutes =
    typeof o.minBookingMinutes === "number" && Number.isFinite(o.minBookingMinutes)
      ? Math.floor(o.minBookingMinutes)
      : NaN;
  const maxBookingMinutes =
    typeof o.maxBookingMinutes === "number" && Number.isFinite(o.maxBookingMinutes)
      ? Math.floor(o.maxBookingMinutes)
      : NaN;

  if (
    !Number.isFinite(minBookingMinutes) ||
    !isMultipleOf(minBookingMinutes, BOOKING_DURATION_UNIT_MINUTES) ||
    minBookingMinutes > BOOKING_DURATION_MAX_CAP_MINUTES
  ) {
    errors.push("minBookingMinutes는 60분 단위의 양의 값이어야 함 (슬롯 간격과 독립)");
  }
  if (
    !Number.isFinite(maxBookingMinutes) ||
    !isMultipleOf(maxBookingMinutes, BOOKING_DURATION_UNIT_MINUTES) ||
    maxBookingMinutes > BOOKING_DURATION_MAX_CAP_MINUTES
  ) {
    errors.push("maxBookingMinutes는 60분 단위의 양의 값이어야 함 (슬롯 간격과 독립)");
  }
  if (
    Number.isFinite(minBookingMinutes) &&
    Number.isFinite(maxBookingMinutes) &&
    minBookingMinutes > maxBookingMinutes
  ) {
    errors.push("minBookingMinutes <= maxBookingMinutes 이어야 함");
  }

  if (typeof o.allowHourlyStart !== "boolean") {
    errors.push("allowHourlyStart는 boolean");
  }
  if (typeof o.allowConsecutiveSlots !== "boolean") {
    errors.push("allowConsecutiveSlots는 boolean");
  }

  // Explicit invalid default (wrong type/unit) — missing is OK (compat fill later).
  if (
    o.defaultBookingMinutes != null &&
    (typeof o.defaultBookingMinutes !== "number" ||
      !Number.isFinite(o.defaultBookingMinutes) ||
      !isMultipleOf(Math.floor(o.defaultBookingMinutes), BOOKING_DURATION_UNIT_MINUTES))
  ) {
    errors.push("defaultBookingMinutes는 60분 단위의 양의 값이어야 함");
  }

  if (errors.length > 0 || !slotIntervalMinutes || !dayStart || !dayEnd) {
    return { ok: false, errors, fallback: { ...DEFAULT_VENUE_BOOKING_POLICY } };
  }

  const allowedDurations = listAllowedBookingDurations({
    slotIntervalMinutes,
    minBookingMinutes,
    maxBookingMinutes,
  });
  if (allowedDurations.length === 0) {
    return {
      ok: false,
      errors: [
        "min~max 구간에 slotIntervalMinutes 배수인 예약 길이가 없습니다 (예: 슬롯 120분 + 최소 180분은 불가)",
      ],
      fallback: { ...DEFAULT_VENUE_BOOKING_POLICY },
    };
  }

  const defaultBookingMinutes = resolveDefaultBookingMinutes(
    o.defaultBookingMinutes,
    allowedDurations,
    minBookingMinutes
  );
  if (
    o.defaultBookingMinutes != null &&
    typeof o.defaultBookingMinutes === "number" &&
    !allowedDurations.includes(Math.floor(o.defaultBookingMinutes))
  ) {
    return {
      ok: false,
      errors: ["defaultBookingMinutes는 허용 예약 길이 중 하나여야 함"],
      fallback: { ...DEFAULT_VENUE_BOOKING_POLICY },
    };
  }

  const policy: VenueBookingPolicy = {
    schemaVersion: 1,
    slotIntervalMinutes,
    minBookingMinutes,
    maxBookingMinutes,
    defaultBookingMinutes,
    allowHourlyStart: Boolean(o.allowHourlyStart),
    allowConsecutiveSlots: Boolean(o.allowConsecutiveSlots),
    dayStart,
    dayEnd,
    updatedAt: o.updatedAt,
    updatedByUid: typeof o.updatedByUid === "string" ? o.updatedByUid : undefined,
  };

  const grid = buildSlotsFromPolicy(policy);
  if (grid.length === 0) {
    return {
      ok: false,
      errors: ["운영 시간 안에 생성 가능한 슬롯이 없습니다"],
      fallback: { ...DEFAULT_VENUE_BOOKING_POLICY },
    };
  }

  return { ok: true, policy };
}

/** Always returns a safe policy — invalid/missing → DEFAULT (2h Nowon SoT). */
export function getEffectiveVenueBookingPolicy(raw: unknown): VenueBookingPolicy {
  const v = validateVenueBookingPolicy(raw);
  return v.ok ? v.policy : { ...v.fallback };
}

/**
 * Canonical slot grid for CMS + admin + public UIs.
 * Grid cells are slotInterval long; multi-cell booking length is separate (consecutive).
 */
export function buildSlotsFromPolicy(
  policy: VenueBookingPolicy
): VenueBookingPolicyPreviewSlot[] {
  const start = clockToMinutes(policy.dayStart);
  const end = clockToMinutes(policy.dayEnd);
  const len = policy.slotIntervalMinutes;
  const step = policy.allowHourlyStart ? 60 : len;
  const out: VenueBookingPolicyPreviewSlot[] = [];

  for (let t = start; t + len <= end; t += step) {
    const startTime = minutesToClock(t);
    const endTime = minutesToClock(t + len);
    out.push({
      startTime,
      endTime,
      slotId: slotIdFromStart(startTime),
    });
  }
  return out;
}

/** @deprecated Prefer buildSlotsFromPolicy — alias for older call sites. */
export const previewSlotsFromPolicy = buildSlotsFromPolicy;

/** Whether start/end is one of the policy grid cells. */
export function isSlotAllowedByPolicy(
  policy: VenueBookingPolicy,
  startTime: string,
  endTime: string
): boolean {
  return buildSlotsFromPolicy(policy).some(
    (s) => s.startTime === startTime && s.endTime === endTime
  );
}

/** Compare default policy grid to legacy buildTwoHourSlots shape. */
export function defaultPolicyMatchesLegacyTwoHourGrid(
  legacy: Array<{ startTime: string; endTime: string }>
): boolean {
  const grid = buildSlotsFromPolicy(DEFAULT_VENUE_BOOKING_POLICY);
  if (grid.length !== legacy.length) return false;
  return grid.every(
    (s, i) => s.startTime === legacy[i]?.startTime && s.endTime === legacy[i]?.endTime
  );
}
