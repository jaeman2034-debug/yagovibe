import { monthKeyFromMs, scoredSessions } from "@/lib/ai-growth/growthReportDimensions";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";

export type SeasonHalf = "H1" | "H2";

export type SeasonWindow = {
  year: number;
  half: SeasonHalf;
  id: string;
  label: string;
  startMs: number;
  endMs: number;
};

export function buildSeasonWindow(year: number, half: SeasonHalf): SeasonWindow {
  const startMs =
    half === "H1"
      ? new Date(year, 0, 1, 0, 0, 0, 0).getTime()
      : new Date(year, 6, 1, 0, 0, 0, 0).getTime();
  const endMs =
    half === "H1"
      ? new Date(year, 5, 30, 23, 59, 59, 999).getTime()
      : new Date(year, 11, 31, 23, 59, 59, 999).getTime();

  return {
    year,
    half,
    id: `${year}-${half}`,
    label: half === "H1" ? `${year} 상반기` : `${year} 하반기`,
    startMs,
    endMs,
  };
}

export function inferDefaultSeason(atMs: number = Date.now()): SeasonWindow {
  const d = new Date(atMs);
  const year = d.getFullYear();
  const half: SeasonHalf = d.getMonth() < 6 ? "H1" : "H2";
  return buildSeasonWindow(year, half);
}

export function filterSessionsForSeason(
  sessions: PlayerGrowthSessionDoc[],
  season: SeasonWindow
): PlayerGrowthSessionDoc[] {
  return sessions.filter(
    (s) => s.generatedAt >= season.startMs && s.generatedAt <= season.endMs
  );
}

/** 세션이 1건 이상 있는 시즌 목록 (최신순) */
export function listSeasonsWithSessions(sessions: PlayerGrowthSessionDoc[]): SeasonWindow[] {
  const scored = scoredSessions(sessions);
  const ids = new Set<string>();

  for (const session of scored) {
    const d = new Date(session.generatedAt);
    const year = d.getFullYear();
    const month = d.getMonth();
    const half: SeasonHalf = month < 6 ? "H1" : "H2";
    ids.add(`${year}-${half}`);
  }

  const seasons = [...ids]
    .map((id) => {
      const [y, h] = id.split("-");
      return buildSeasonWindow(Number(y), h as SeasonHalf);
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return a.half === "H2" ? -1 : 1;
    });

  if (seasons.length === 0) {
    return [inferDefaultSeason()];
  }

  const current = inferDefaultSeason();
  if (!seasons.some((s) => s.id === current.id)) {
    seasons.unshift(current);
  }

  return seasons;
}

export function seasonContainsMonthKey(season: SeasonWindow, monthKey: string): boolean {
  const [y, m] = monthKey.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return false;
  const ms = new Date(y, m - 1, 15).getTime();
  return ms >= season.startMs && ms <= season.endMs;
}

export function monthKeysInSeason(season: SeasonWindow): string[] {
  const keys: string[] = [];
  const start = new Date(season.startMs);
  const end = new Date(season.endMs);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor.getTime() <= end.getTime()) {
    keys.push(monthKeyFromMs(cursor.getTime()));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}
