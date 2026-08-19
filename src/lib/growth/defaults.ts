export type GrowthPlan = "month" | "year";
export type ContextualTrigger = "rank_up" | "coach_tease" | "streak" | "post_match";

export type GrowthConfig = {
  paywall_default_plan: GrowthPlan;
  paywall_show_annual: boolean;
  paywall_annual_emphasis: boolean;
  coach_tease_headline: string;
  coach_tease_cta: string;
  coach_tease_subcopy: string;
  rank_up_headline: string;
  rank_up_subcopy: string;
  streak_headline: string;
  streak_subcopy: string;
  contextual_trigger_priority: ContextualTrigger[];
  discount_offer_enabled: boolean;
  discount_offer_percent: number;
};

export const DEFAULT_GROWTH_CONFIG: GrowthConfig = {
  paywall_default_plan: "month",
  paywall_show_annual: true,
  paywall_annual_emphasis: false,
  coach_tease_headline: "Unlock full coach history",
  coach_tease_cta: "Unlock Pro",
  coach_tease_subcopy: "지난 경기 코칭 분석 잠금 🔒 — PRO에서 전체 히스토리를 확인하세요.",
  rank_up_headline: "빠르게 올라가고 있어요",
  rank_up_subcopy: "PRO 스카우팅과 더 깊은 인사이트를 잠금 해제하세요.",
  streak_headline: "{streak}연속 훈련 달성!",
  streak_subcopy: "모멘텀을 이어가세요. AI Coach PRO로 더 깊은 인사이트를 받아보세요.",
  contextual_trigger_priority: ["rank_up", "coach_tease", "streak", "post_match"],
  discount_offer_enabled: false,
  discount_offer_percent: 0,
};
