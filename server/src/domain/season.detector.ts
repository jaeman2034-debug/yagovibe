/**
 * 🔥 Season Detector - 시즌 자동 + 근거
 * 
 * Week1~2 API Stub 기준
 */

import type { LeagueInfo, Story } from "./types";

export type SeasonDecision =
  | { mode: "season"; reason: "league_active" | "league_within_7d" | "assoc_league_stories" }
  | { mode: "default"; reason: "no_signal" };

export function detectSeasonDecision(
  leagues: LeagueInfo[] | null,
  stories: Story[]
): SeasonDecision {
  const now = Date.now();
  const in7d = now + 7 * 24 * 60 * 60 * 1000;

  // 1. 진행 중 대회
  if (
    leagues?.some(
      (l) =>
        new Date(l.startAt).getTime() <= now &&
        now <= new Date(l.endAt).getTime()
    )
  ) {
    return { mode: "season", reason: "league_active" };
  }

  // 2. 7일 이내 시작 대회
  if (
    leagues?.some(
      (l) =>
        new Date(l.startAt).getTime() <= in7d &&
        new Date(l.endAt).getTime() >= now
    )
  ) {
    return { mode: "season", reason: "league_within_7d" };
  }

  // 3. 협회 대회 스토리 2개 이상
  const assocLeagueStories = stories.filter(
    (s) => s.source === "협회" && s.category === "대회"
  );
  if (assocLeagueStories.length >= 2) {
    return { mode: "season", reason: "assoc_league_stories" };
  }

  return { mode: "default", reason: "no_signal" };
}
