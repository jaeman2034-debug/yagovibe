/**
 * 🔥 Season Detector - 시즌 모드 자동 판정
 * 
 * 대회 데이터가 있으면 → 자동 season 모드
 * 없으면 → default 모드
 * 판정 근거를 포함하여 로그에 기록
 */

import type { Story } from "./story.types";

type LeagueInfo = {
  id: string;
  startAt: string; // ISO string
  endAt: string;   // ISO string
};

/**
 * 시즌 판정 결과 (근거 포함)
 */
export type SeasonDecision =
  | { mode: "season"; reason: "league_active" | "league_within_7d" | "assoc_league_stories" }
  | { mode: "default"; reason: "no_signal" };

/**
 * 시즌 모드 자동 판정 (근거 포함)
 * 
 * 판정 기준:
 * 1. 진행 중 대회 존재
 * 2. 7일 이내 시작 대회 존재
 * 3. 협회 공지 중 "대회" 카테고리 2개 이상
 */
export const detectSeasonDecision = (
  leagues: LeagueInfo[] | null,
  stories: Story[]
): SeasonDecision => {
  const now = Date.now();
  const in7days = now + 7 * 24 * 60 * 60 * 1000;

  // 1) 진행 중 대회
  if (leagues?.some((l) => {
    const start = new Date(l.startAt).getTime();
    const end = new Date(l.endAt).getTime();
    return start <= now && now <= end;
  })) {
    return { mode: "season", reason: "league_active" };
  }

  // 2) 7일 이내 시작 + 종료는 미래(또는 진행)
  if (leagues?.some((l) => {
    const start = new Date(l.startAt).getTime();
    const end = new Date(l.endAt).getTime();
    return start <= in7days && end >= now;
  })) {
    return { mode: "season", reason: "league_within_7d" };
  }

  // 3) 협회 대회 스토리 2개 이상
  const assocLeagueStories = stories.filter(
    (s) => s.source === "협회" && s.category === "대회"
  );
  if (assocLeagueStories.length >= 2) {
    return { mode: "season", reason: "assoc_league_stories" };
  }

  return { mode: "default", reason: "no_signal" };
};

/**
 * 하위 호환성: 기존 detectSeasonMode 유지
 */
export const detectSeasonMode = (
  leagues: LeagueInfo[] | null,
  stories: Story[]
): "season" | "default" => {
  return detectSeasonDecision(leagues, stories).mode;
};
