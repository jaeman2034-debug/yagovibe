/** 팀 생성 → AI 브랜딩 온보딩 (선택형 UX) */

export const TEAM_BRAND_STYLES = [
  { id: "social", emoji: "⚽", label: "친목 중심" },
  { id: "competitive", emoji: "🔥", label: "실력 중심" },
  { id: "tournament", emoji: "🏆", label: "대회 지향" },
  { id: "youth", emoji: "👶", label: "유소년" },
  { id: "corporate", emoji: "💼", label: "직장인" },
] as const;

export type TeamBrandStyleId = (typeof TEAM_BRAND_STYLES)[number]["id"];

export const TEAM_ONBOARD_MAIN_ACTIVITY = [
  { id: "weekend", label: "주말 경기" },
  { id: "weekday", label: "평일 경기" },
  { id: "league", label: "리그 참여" },
  { id: "casual", label: "자유 경기" },
] as const;

export type TeamOnboardMainActivityId = (typeof TEAM_ONBOARD_MAIN_ACTIVITY)[number]["id"];

export const TEAM_ONBOARD_VIBE = [
  { id: "fun", label: "즐겜 😄" },
  { id: "balanced", label: "적당히 🙂" },
  { id: "serious", label: "빡겜 🔥" },
] as const;

export type TeamOnboardVibeId = (typeof TEAM_ONBOARD_VIBE)[number]["id"];

export const TEAM_ONBOARD_RECRUIT = [
  { id: "beginners", label: "초보 환영" },
  { id: "experienced", label: "경험자 위주" },
  { id: "open", label: "누구나 가능" },
] as const;

export type TeamOnboardRecruitId = (typeof TEAM_ONBOARD_RECRUIT)[number]["id"];

export const DEFAULT_TEAM_ONBOARDING = {
  brandStyle: "social" satisfies TeamBrandStyleId,
  mainActivity: "weekend" satisfies TeamOnboardMainActivityId,
  vibe: "balanced" satisfies TeamOnboardVibeId,
  recruitStyle: "open" satisfies TeamOnboardRecruitId,
} as const;
