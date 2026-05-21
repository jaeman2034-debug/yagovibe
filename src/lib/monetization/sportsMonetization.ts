import type { PlanType } from "@/types/plan";

/** 플랫폼 스포츠 허브·결제 연동용 (PG 붙이기 전 단계의 상품·카피 단일 소스) */
export type PlatformPaymentKind = "LEAGUE_ENTRY" | "TEAM_PREMIUM" | "RECRUIT_BOOST" | "MATCH_BOOST";

export type PlatformPaymentIntent = {
  kind: PlatformPaymentKind;
  amountKrw: number;
  title: string;
  description?: string;
  /** 결제 완료 후 이동·복귀용 (추후 딥링크 확장) */
  returnPath?: string;
};

/** 부스트·참가비 가격 예시(기획 고정값 — 리그 문서 entryFeeKrw가 우선) */
export const SPORTS_MONETIZATION = {
  recruitBoostKrw: 3000,
  matchBoostKrw: 3000,
  leagueEntryPlaceholderKrw: 5000,
  /** 무료 플랜에서 “운영 부담” 힌트를 줄 멤버 수 기준 (제안용, 실제 차단은 teams.plan + Rules) */
  teamPremiumUpsellMemberThreshold: 5,
} as const;

export function normalizeTeamPlan(raw: unknown): PlanType {
  if (raw === "pro") return "pro";
  if (raw === "academy_pro") return "academy_pro";
  return "free";
}

export function shouldSuggestTeamPremium(opts: {
  hasTeam: boolean;
  plan: PlanType;
  teamMemberCount: number;
}): boolean {
  if (!opts.hasTeam || opts.plan !== "free") return false;
  if (opts.teamMemberCount < 0) return false;
  return opts.teamMemberCount >= SPORTS_MONETIZATION.teamPremiumUpsellMemberThreshold;
}

export function shouldSuggestRecruitBoost(opts: {
  hasTeam: boolean;
  teamMemberCount: number;
}): boolean {
  if (!opts.hasTeam) return false;
  if (opts.teamMemberCount < 0) return false;
  return opts.teamMemberCount < SPORTS_MONETIZATION.teamPremiumUpsellMemberThreshold;
}
