/**
 * Nowon Venue Rental — Sprint 3 Phase B pure pricing / lighting calculator.
 * ESTIMATE only. No payment / settlement semantics.
 */

import {
  HOLIDAY_CALENDAR_SOURCE_REQUIRED,
  LIGHTING_HOURLY_RATE_KRW,
  LIGHTING_MONTHLY_WINDOWS,
  VENUE_PRICING_ENGINE_VERSION,
  VENUE_PRICING_POLICY_ID,
  getLockedBasePolicy,
  isLightingApplicableVenue,
  type LockedSuraksanPolicy,
} from "./venuePricingPolicyLock";

export type FeeLineStatus =
  | "CALCULATED"
  | "PRICE_CONFIRMATION_REQUIRED"
  | "NOT_APPLICABLE";

export type QuoteStatus =
  | "CALCULATED"
  | "PARTIAL"
  | "PRICE_CONFIRMATION_REQUIRED";

export type VenuePricingInput = {
  venueId: string;
  bookingDate: string; // YYYY-MM-DD (Asia/Seoul civil date)
  slotStart: string; // HH:mm
  slotEnd: string; // HH:mm
  /**
   * Optional injected holiday flag for tests / future trusted calendar.
   * Engine never invents holiday dates; without this, weekdays use weekday tiers.
   */
  isHoliday?: boolean;
};

export type FeeAmount = {
  amount: number | null;
  status: FeeLineStatus;
};

export type PricingBreakdownLine = {
  code: string;
  label: string;
  amount?: number;
  minutes?: number;
};

export type VenuePricingQuote = {
  status: QuoteStatus;
  baseFee: FeeAmount;
  lightingFee: FeeAmount;
  totalFee: FeeAmount;
  breakdown: PricingBreakdownLine[];
  blockers: string[];
  durationMinutes: number;
  lightingOverlapMinutes: number;
  engineVersion: typeof VENUE_PRICING_ENGINE_VERSION;
  pricingPolicyId: typeof VENUE_PRICING_POLICY_ID;
  /** ESTIMATE — never PAID / FINAL_SETTLEMENT */
  estimateKind: "ESTIMATE";
  /** Snapshot persist not authorized from client in Phase B */
  snapshotPersistAllowed: false;
  snapshotContractGap?: "BOOKING_PRICING_SNAPSHOT_CONTRACT_GAP";
};

export function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/** Asia/Seoul civil date parts from YYYY-MM-DD (no invented TZ shift). */
export function parseSeoulCalendarDate(isoDate: string): {
  year: number;
  month: number;
  day: number;
  /** 0=Sun … 6=Sat */
  dayOfWeek: number;
} {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    throw new Error(`Invalid bookingDate: ${isoDate}`);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  // Noon KST → stable weekday for that civil date
  const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+09:00`);
  return { year, month, day, dayOfWeek: dt.getUTCDay() };
}

export function intervalOverlapMinutes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

export function computeLightingOverlapMinutes(
  bookingDate: string,
  slotStart: string,
  slotEnd: string
): number {
  const { month } = parseSeoulCalendarDate(bookingDate);
  const windows = LIGHTING_MONTHLY_WINDOWS[month] || [];
  const b0 = clockToMinutes(slotStart);
  const b1 = clockToMinutes(slotEnd);
  let total = 0;
  for (const w of windows) {
    total += intervalOverlapMinutes(b0, b1, clockToMinutes(w.start), clockToMinutes(w.end));
  }
  return total;
}

function krwFromHourly(minutes: number, ratePerHour: number): number {
  return Math.round((minutes * ratePerHour) / 60);
}

function computeSuraksanBase(
  policy: LockedSuraksanPolicy,
  bookingDate: string,
  slotStart: string,
  slotEnd: string,
  isHoliday: boolean | undefined
): {
  amount: number;
  lines: PricingBreakdownLine[];
  blockers: string[];
} {
  const { dayOfWeek } = parseSeoulCalendarDate(bookingDate);
  const duration = clockToMinutes(slotEnd) - clockToMinutes(slotStart);
  const blockers: string[] = [];
  const lines: PricingBreakdownLine[] = [];

  // Trusted holiday calendar unavailable — document blocker for weekday auto holiday identity.
  blockers.push(HOLIDAY_CALENDAR_SOURCE_REQUIRED);

  if (isHoliday === true) {
    const amount = krwFromHourly(duration, policy.holidayRatePerHour);
    lines.push({
      code: "SURAKSAN_HOLIDAY",
      label: `공휴일 ${policy.holidayRatePerHour.toLocaleString("ko-KR")}원/시간 × ${duration / 60}시간`,
      amount,
      minutes: duration,
    });
    return { amount, lines, blockers };
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend) {
    const amount = krwFromHourly(duration, policy.weekendRatePerHour);
    lines.push({
      code: "SURAKSAN_WEEKEND",
      label: `주말 ${policy.weekendRatePerHour.toLocaleString("ko-KR")}원/시간 × ${duration / 60}시간`,
      amount,
      minutes: duration,
    });
    return { amount, lines, blockers };
  }

  const cutoff = clockToMinutes(policy.nightCutoffHhmm);
  const start = clockToMinutes(slotStart);
  const end = clockToMinutes(slotEnd);
  let amount = 0;

  if (end <= cutoff) {
    amount = krwFromHourly(duration, policy.weekdayDayRatePerHour);
    lines.push({
      code: "SURAKSAN_WEEKDAY_DAY",
      label: `평일 주간 ${policy.weekdayDayRatePerHour.toLocaleString("ko-KR")}원/시간 × ${duration / 60}시간`,
      amount,
      minutes: duration,
    });
  } else if (start >= cutoff) {
    amount = krwFromHourly(duration, policy.weekdayNightRatePerHour);
    lines.push({
      code: "SURAKSAN_WEEKDAY_NIGHT",
      label: `평일 야간 ${policy.weekdayNightRatePerHour.toLocaleString("ko-KR")}원/시간 × ${duration / 60}시간`,
      amount,
      minutes: duration,
    });
  } else {
    const dayMins = cutoff - start;
    const nightMins = end - cutoff;
    const dayAmt = krwFromHourly(dayMins, policy.weekdayDayRatePerHour);
    const nightAmt = krwFromHourly(nightMins, policy.weekdayNightRatePerHour);
    amount = dayAmt + nightAmt;
    lines.push({
      code: "SURAKSAN_WEEKDAY_DAY_SPLIT",
      label: `평일 주간 ${policy.weekdayDayRatePerHour.toLocaleString("ko-KR")}원/시간 × ${dayMins / 60}시간`,
      amount: dayAmt,
      minutes: dayMins,
    });
    lines.push({
      code: "SURAKSAN_WEEKDAY_NIGHT_SPLIT",
      label: `평일 야간 ${policy.weekdayNightRatePerHour.toLocaleString("ko-KR")}원/시간 × ${nightMins / 60}시간`,
      amount: nightAmt,
      minutes: nightMins,
    });
  }

  return { amount, lines, blockers };
}

/**
 * Pure estimate calculator.
 * Does not write Firestore. Does not invent holiday dates.
 */
export function calculateVenuePricing(input: VenuePricingInput): VenuePricingQuote {
  const durationMinutes =
    clockToMinutes(input.slotEnd) - clockToMinutes(input.slotStart);
  if (durationMinutes <= 0) {
    throw new Error("slotEnd must be after slotStart");
  }

  const policy = getLockedBasePolicy(input.venueId);
  const breakdown: PricingBreakdownLine[] = [];
  const blockers: string[] = [];

  let baseFee: FeeAmount;
  if (policy.model === "FLAT_HOURLY") {
    const amount = krwFromHourly(durationMinutes, policy.flatHourlyRate);
    baseFee = { amount, status: "CALCULATED" };
    breakdown.push({
      code: "FLAT_HOURLY",
      label: `기본 대관료 ${policy.flatHourlyRate.toLocaleString("ko-KR")}원/시간 × ${durationMinutes / 60}시간`,
      amount,
      minutes: durationMinutes,
    });
  } else if (policy.model === "WEEKEND_ONLY_CONFIRMED") {
    const { dayOfWeek } = parseSeoulCalendarDate(input.bookingDate);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend) {
      baseFee = { amount: null, status: "PRICE_CONFIRMATION_REQUIRED" };
      blockers.push("WEEKDAY_RATE_UNKNOWN");
      breakdown.push({
        code: "WEEKEND_ONLY_WEEKDAY_UNSUPPORTED",
        label: "기본 대관료 확인 필요",
      });
    } else {
      const amount = krwFromHourly(durationMinutes, policy.weekendHourlyRate);
      baseFee = { amount, status: "CALCULATED" };
      breakdown.push({
        code: "WEEKEND_ONLY_CONFIRMED",
        label: `주말 대관료 ${policy.weekendHourlyRate.toLocaleString("ko-KR")}원/시간 × ${durationMinutes / 60}시간`,
        amount,
        minutes: durationMinutes,
      });
    }
  } else if (policy.model === "TIME_CALENDAR_TIERED") {
    const computed = computeSuraksanBase(
      policy,
      input.bookingDate,
      input.slotStart,
      input.slotEnd,
      input.isHoliday
    );
    baseFee = { amount: computed.amount, status: "CALCULATED" };
    breakdown.push(...computed.lines);
    blockers.push(...computed.blockers);
  } else if (policy.model === "CONFLICTING") {
    baseFee = { amount: null, status: "PRICE_CONFIRMATION_REQUIRED" };
    blockers.push("BASE_RATE_CONFLICTING");
    breakdown.push({
      code: "BASE_CONFLICT",
      label: "기본 대관료 확인 필요",
    });
  } else {
    baseFee = { amount: null, status: "PRICE_CONFIRMATION_REQUIRED" };
    blockers.push("BASE_RATE_UNKNOWN");
    breakdown.push({
      code: "BASE_UNKNOWN",
      label: "기본 대관료 확인 필요",
    });
  }

  let lightingOverlapMinutes = 0;
  let lightingFee: FeeAmount;

  if (!isLightingApplicableVenue(input.venueId)) {
    lightingFee = { amount: 0, status: "NOT_APPLICABLE" };
    breakdown.push({
      code: "LIGHTING_NOT_APPLICABLE",
      label: "조명 사용료 해당 없음",
      amount: 0,
    });
  } else {
    lightingOverlapMinutes = computeLightingOverlapMinutes(
      input.bookingDate,
      input.slotStart,
      input.slotEnd
    );
    const amount = krwFromHourly(lightingOverlapMinutes, LIGHTING_HOURLY_RATE_KRW);
    lightingFee = { amount, status: "CALCULATED" };
    breakdown.push({
      code: "LIGHTING_OVERLAP",
      label:
        lightingOverlapMinutes === 0
          ? "조명 겹침 없음"
          : `예상 조명료 ${LIGHTING_HOURLY_RATE_KRW.toLocaleString("ko-KR")}원/시간 × ${lightingOverlapMinutes / 60}시간`,
      amount,
      minutes: lightingOverlapMinutes,
    });
  }

  const baseOk = baseFee.status === "CALCULATED" && baseFee.amount != null;
  const lightingOk =
    lightingFee.status === "CALCULATED" || lightingFee.status === "NOT_APPLICABLE";

  let totalFee: FeeAmount;
  let status: QuoteStatus;

  if (baseOk && lightingOk) {
    const lightingAmt = lightingFee.amount ?? 0;
    totalFee = { amount: (baseFee.amount as number) + lightingAmt, status: "CALCULATED" };
    status = "CALCULATED";
  } else if (!baseOk && lightingFee.status === "CALCULATED" && (lightingFee.amount ?? 0) > 0) {
    totalFee = { amount: null, status: "PRICE_CONFIRMATION_REQUIRED" };
    status = "PARTIAL";
  } else if (!baseOk) {
    totalFee = { amount: null, status: "PRICE_CONFIRMATION_REQUIRED" };
    status = "PRICE_CONFIRMATION_REQUIRED";
  } else {
    totalFee = { amount: null, status: "PRICE_CONFIRMATION_REQUIRED" };
    status = "PRICE_CONFIRMATION_REQUIRED";
  }

  return {
    status,
    baseFee,
    lightingFee,
    totalFee,
    breakdown,
    blockers: [...new Set(blockers)],
    durationMinutes,
    lightingOverlapMinutes,
    engineVersion: VENUE_PRICING_ENGINE_VERSION,
    pricingPolicyId: VENUE_PRICING_POLICY_ID,
    estimateKind: "ESTIMATE",
    snapshotPersistAllowed: false,
    snapshotContractGap: "BOOKING_PRICING_SNAPSHOT_CONTRACT_GAP",
  };
}

/** Public/admin copy labels — do not expose internal conflict amounts. */
export function formatQuoteStatusLabel(status: QuoteStatus): string {
  switch (status) {
    case "CALCULATED":
      return "계산 완료";
    case "PARTIAL":
      return "부분 계산";
    case "PRICE_CONFIRMATION_REQUIRED":
      return "요금 확인 필요";
    default:
      return "요금 확인 필요";
  }
}

export function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
