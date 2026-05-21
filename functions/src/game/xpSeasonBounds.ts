/**
 * 주간 시즌 ID(ISO 서울 주차)에 대한 [월요일 00:00, 일요일 23:59:59.999] Asia/Seoul 구간
 */
import { getCurrentWeeklySeasonId, getSeoulDateKey } from "./xpTimeKeys";

const SEASON_ID_RE = /^(\d{4})-W(\d{2})$/;

export function parseWeeklySeasonId(seasonId: string): { weekYear: number; week: number } | null {
  const m = seasonId.trim().match(SEASON_ID_RE);
  if (!m) return null;
  const weekYear = Number(m[1]);
  const week = Number(m[2]);
  if (!Number.isFinite(weekYear) || !Number.isFinite(week) || week < 1 || week > 53) return null;
  return { weekYear, week };
}

function isMondaySeoul(d: Date): boolean {
  const w = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(d);
  return w.startsWith("Mon");
}

/**
 * `seasonId`에 해당하는 주의 월요일 00:00 ~ 일요일 23:59:59.999 (서울).
 * ISO 주차·`getCurrentWeeklySeasonId`와 동일한 주 정의.
 */
export function getWeeklySeasonBounds(seasonId: string): { startAt: Date; endAt: Date } | null {
  const parsed = parseWeeklySeasonId(seasonId);
  if (!parsed) return null;
  const { weekYear } = parsed;

  const scanStart = new Date(`${weekYear - 1}-11-01T12:00:00+09:00`);
  for (let i = 0; i < 480; i++) {
    const noon = new Date(scanStart.getTime() + i * 86400000);
    if (getCurrentWeeklySeasonId(noon) !== seasonId) continue;
    if (!isMondaySeoul(noon)) continue;

    const ymd = getSeoulDateKey(noon);
    const startAt = new Date(`${ymd}T00:00:00+09:00`);
    const endAt = new Date(startAt.getTime() + 7 * 86400000 - 1);
    return { startAt, endAt };
  }

  return null;
}
