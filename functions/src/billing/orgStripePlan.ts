import type { TeamPlanId } from "../lib/teamPlan";

/** 팀 플랜 → Org Billing UI 의 planId (free | pro | enterprise) */
export function teamPlanToOrgPlanId(plan: TeamPlanId): "free" | "pro" | "enterprise" {
  if (plan === "team_plus") return "enterprise";
  if (plan === "pro" || plan === "basic") return "pro";
  return "free";
}
