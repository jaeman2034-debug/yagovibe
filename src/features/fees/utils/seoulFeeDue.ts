/**
 * 회비 마감일 판정 — Cloud Functions 스케줄러와 동일하게 Asia/Seoul 달력일 기준.
 */

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

/** 해당 서울 달력일 23:59:59.999 KST 에 해당하는 UTC epoch ms */
export function seoulDayEndMillisForDueInstant(dueMs: number): number {
  const { y, M, d } = seoulCalendarFromInstant(dueMs);
  return Date.UTC(y, M - 1, d, 14, 59, 59, 999);
}

/** 서울 기준 YYYYMM (스케줄러 stats 문서 id와 동일) */
export function seoulYyyyMm(ms: number = Date.now()): string {
  const { y, M } = seoulCalendarFromInstant(ms);
  return `${y}${String(M).padStart(2, "0")}`;
}

/** YYYYMM 키에 달력 기준 delta개월 가감 (음수 = 과거) */
export function seoulYyyyMmAddMonths(yyyymm: string, delta: number): string {
  let y = Number(yyyymm.slice(0, 4));
  let m = Number(yyyymm.slice(4, 6));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return yyyymm;
  let mm = m + delta;
  while (mm > 12) {
    mm -= 12;
    y += 1;
  }
  while (mm < 1) {
    mm += 12;
    y -= 1;
  }
  return `${y}${String(mm).padStart(2, "0")}`;
}

/** start~end(포함) 월 키를 시간순 배열로 (둘 다 YYYYMM) */
export function enumerateSeoulYyyyMmRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 36) {
    out.push(cur);
    cur = seoulYyyyMmAddMonths(cur, 1);
    guard += 1;
  }
  return out;
}
