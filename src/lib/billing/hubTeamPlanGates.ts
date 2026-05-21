import type { HubTeamBillingStatus, HubTeamPlanId } from "@/types/teamBilling";

const PLAN_ORDER: HubTeamPlanId[] = ["free", "basic", "pro", "team_plus"];

export function normalizeHubTeamPlan(raw: unknown): HubTeamPlanId {
  const p = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (p === "basic" || p === "pro" || p === "team_plus") return p;
  return "free";
}

export function normalizeHubBillingStatus(raw: unknown): HubTeamBillingStatus {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "trialing" || v === "past_due" || v === "canceled") return v;
  return "active";
}

export function isBillingEntitledForPaidFeatures(status: HubTeamBillingStatus): boolean {
  return status === "active" || status === "trialing";
}

export function isPlanAtLeast(plan: HubTeamPlanId, min: HubTeamPlanId): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(min);
}

/** 미납 전체 독촉 등 — Basic 이상 + 결제 상태 정상 */
export function canUseBulkFeeReminders(plan: HubTeamPlanId, billingStatus: HubTeamBillingStatus): boolean {
  return isBillingEntitledForPaidFeatures(billingStatus) && isPlanAtLeast(plan, "basic");
}

/** 월간 리포트·고급 KPI 등 — Pro 이상 */
export function canUseMonthlyFeeReportPremium(plan: HubTeamPlanId, billingStatus: HubTeamBillingStatus): boolean {
  return isBillingEntitledForPaidFeatures(billingStatus) && isPlanAtLeast(plan, "pro");
}
