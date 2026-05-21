/**
 * XP 일·주간 캡 경계 — 항상 Asia/Seoul (DST 없음, 운영 기준 단일 타임존)
 */
const SEOUL_TZ = "Asia/Seoul";

/** YYYY-MM-DD (서울 달력일) */
export function getSeoulDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * 서울 달력일 정오 시각의 Instant에 대해 ISO 주차 키 (예: 2026-W19)
 * 주 경계는 ISO 8601 (월요일 시작) 기준, week-year는 ISO week-year
 */
export function getSeoulWeekKey(now: Date = new Date()): string {
  const ymd = getSeoulDateKey(now);
  const anchor = new Date(`${ymd}T12:00:00+09:00`);
  const { weekYear, week } = isoWeekYearAndWeekUTC(anchor);
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

/**
 * 주간 시즌 ID (= `getSeoulWeekKey`).
 * ISO 8601 주(월요일 시작) × Asia/Seoul 달력일과 정합 — “매주 월요일 0시(한국) 초기화” 카피와 일치.
 */
export function getCurrentWeeklySeasonId(now: Date = new Date()): string {
  return getSeoulWeekKey(now);
}

/** Instant의 UTC 날짜를 기준으로 ISO week-year / week (RFC 관행) */
function isoWeekYearAndWeekUTC(instant: Date): { weekYear: number; week: number } {
  const x = new Date(instant.getTime());
  x.setUTCHours(0, 0, 0, 0);
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day + 3);
  const firstThursday = x.getTime();
  x.setUTCMonth(0, 1);
  if (x.getUTCDay() !== 4) {
    x.setUTCMonth(0, 1 + ((4 - x.getUTCDay() + 7) % 7));
  }
  const weekYear = x.getUTCFullYear();
  const week = 1 + Math.round((firstThursday - x.getTime()) / 604800000);
  return { weekYear, week };
}
