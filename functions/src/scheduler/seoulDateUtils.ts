import { Timestamp } from "firebase-admin/firestore";

export function seoulCalendarFromInstant(ms: number): { y: number; M: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const M = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, M, d };
}

export function addUtcCalendarDays(y: number, M: number, d: number, delta: number): { y: number; M: number; d: number } {
  const nd = new Date(Date.UTC(y, M - 1, d + delta));
  return { y: nd.getUTCFullYear(), M: nd.getUTCMonth() + 1, d: nd.getUTCDate() };
}

/** Asia/Seoul 해당 일 00:00 ~ 23:59:59.999 (dueDate Timestamp 비교용) */
export function seoulDayToDueDateBounds(y: number, M: number, d: number): { start: Timestamp; end: Timestamp } {
  const startMs = Date.UTC(y, M - 1, d, -9, 0, 0, 0);
  const endMs = Date.UTC(y, M - 1, d, 14, 59, 59, 999);
  return { start: Timestamp.fromMillis(startMs), end: Timestamp.fromMillis(endMs) };
}

export function seoulDateLabel(y: number, M: number, d: number): string {
  return `${y}-${String(M).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 서울 기준 YYYYMM (자동결제 주문·사이클 키) */
export function seoulYyyyMm(ms: number): string {
  const { y, M } = seoulCalendarFromInstant(ms);
  return `${y}${String(M).padStart(2, "0")}`;
}

/** 서울 기준 YYYYMMDD (일 1회 멱등 run 키) */
export function seoulYyyymmdd(ms: number): string {
  const { y, M, d } = seoulCalendarFromInstant(ms);
  return `${y}${String(M).padStart(2, "0")}${String(d).padStart(2, "0")}`;
}

/** due 시각이 속한 서울 달력일의 마감 이후인지 (연체 판정) */
export function isPastSeoulEndOfDueDay(due: Timestamp, nowMs: number): boolean {
  const { y, M, d } = seoulCalendarFromInstant(due.toMillis());
  const { end } = seoulDayToDueDateBounds(y, M, d);
  return nowMs > end.toMillis();
}

/**
 * 서울 마감일 종료 시각 이후 경과 **일수** (당일·이전 0, 마감 다음날부터 1).
 * 클라이언트 `getOverdueDays` / 연체 스냅샷과 동일한 기준.
 */
export function getOverdueDayNumberFromDueTimestamp(due: Timestamp, nowMs: number): number {
  const { y, M, d } = seoulCalendarFromInstant(due.toMillis());
  const { end } = seoulDayToDueDateBounds(y, M, d);
  const endMs = end.toMillis();
  if (nowMs <= endMs) return 0;
  const diff = nowMs - endMs;
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** D+1, D+3, 이후 7일마다 (7, 14, 21, …) */
export function shouldSendOverdueReminderDay(overdueDay: number): boolean {
  if (overdueDay < 1) return false;
  if (overdueDay === 1 || overdueDay === 3) return true;
  if (overdueDay >= 7 && overdueDay % 7 === 0) return true;
  return false;
}
