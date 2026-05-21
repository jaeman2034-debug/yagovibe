import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 회비 회차 월 식별자 — 서울 달력 `YYYY-MM` 단일 규칙.
 * Firestore `Timestamp#toDate()` 등 **절대 시각**을 받아 `Asia/Seoul` 달력 월으로만 변환하므로
 * 클라이언트 로컬 TZ와 무관하게 동일 인스턴트 → 동일 `YYYY-MM`.
 * (`feeMonthKeyForPicker`의 dueDate 폴백·`seoulYmNow`와 동일 기준 유지)
 */
export function teamFeeSeoulMonthKey(d: Date): string {
  return dayjs(d).tz("Asia/Seoul").format("YYYY-MM");
}

/** UI 칩 제목 — 로컬 `Date#getMonth` 대신 서울 달력 월 사용 */
export function teamFeeSeoulMonthTitle(d: Date): string {
  const m = dayjs(d).tz("Asia/Seoul").month() + 1;
  return `${m}월 회비`;
}

/** 회비 마감일·연납일(`yearlyPaidAt`) 등 — `Asia/Seoul` 달력 연도 (클라 로컬 TZ와 무관) */
export function teamFeeSeoulCalendarYear(d: Date): number {
  return dayjs(d).tz("Asia/Seoul").year();
}

/** @deprecated 이름 호환 — `teamFeeSeoulMonthKey`와 동일 */
export function seoulYearMonthFromDate(d: Date): string {
  return teamFeeSeoulMonthKey(d);
}

/** 서울 달력 기준 오늘이 속한 달의 `YYYY-MM` (CF 스케줄·`seoulYmNow`와 동일 축) */
export function teamFeeCurrentSeoulMonthKey(): string {
  return teamFeeSeoulMonthKey(new Date());
}

/** 마감 시각(절대시각)이 주어진 서울 월 키와 같은 달인지 */
export function isDueInSeoulYm(d: Date | null | undefined, ymYYYY_MM: string): boolean {
  if (!d) return false;
  return teamFeeSeoulMonthKey(d) === ymYYYY_MM;
}

/** `getSeoulMonthRange` 반환 — 원장·리포트·쿼리 경계에 재사용 */
export type SeoulMonthRange = {
  /** 서울 달 1일 00:00:00.000 (포함) */
  start: Date;
  /** 서울 달 말일 23:59:59.999 (포함) — UI·로그·닫힌 구간 표현용 */
  end: Date;
  /**
   * 다음 달 1일 00:00:00.000 (서울) — **Firestore 권장** 상한(배타).
   * `where("x", ">=", start)` + `where("x", "<", endExclusive)` → ms 경계 이슈 없음.
   */
  endExclusive: Date;
  /** 표시·로그용 RFC3339 (+09:00) */
  startIso: string;
  endIso: string;
  endExclusiveIso: string;
};

const SEOUL_YM_RE = /^(\d{4})-(\d{2})$/;

/**
 * 서울 달력 한 달의 절대시각 경계.
 * - `ym`은 `teamFeeSeoulMonthKey` / `teamFeeCurrentSeoulMonthKey`와 동일한 `YYYY-MM` (zero-pad).
 * - Firestore: **`>= start` + `< endExclusive`** (반개구간) 권장. `end`는 UI·포함 구간용.
 * - 제약 튜플: `@/lib/fees/getSeoulMonthQueryConstraints` 의 `getSeoulMonthQueryConstraints`.
 */
export function getSeoulMonthRange(ymYYYY_MM: string): SeoulMonthRange | null {
  const raw = ymYYYY_MM.trim();
  const match = SEOUL_YM_RE.exec(raw);
  if (!match) return null;
  const yStr = match[1]!;
  const moStr = match[2]!;
  const monthNum = Number.parseInt(moStr, 10);
  if (monthNum < 1 || monthNum > 12) return null;

  const start = dayjs.tz(`${yStr}-${moStr}-01`, "YYYY-MM-DD", "Asia/Seoul").startOf("day");
  if (!start.isValid()) return null;

  const end = start.endOf("month");
  const endExclusive = start.add(1, "month").startOf("day");
  return {
    start: start.toDate(),
    end: end.toDate(),
    endExclusive: endExclusive.toDate(),
    startIso: start.format(),
    endIso: end.format(),
    endExclusiveIso: endExclusive.format(),
  };
}
