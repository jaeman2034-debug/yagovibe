/** 팀 SaaS 플랜 — Firestore `teams.plan` / Functions `teamPlan.ts` 와 동일 */
export type HubTeamPlanId = "free" | "basic" | "pro" | "team_plus";

/** Stripe 반영 `teams.billingStatus` */
export type HubTeamBillingStatus = "active" | "trialing" | "past_due" | "canceled";
