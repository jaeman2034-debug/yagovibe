/**
 * 팀 SaaS 플랜 — 팀 문서에는 plan / billing 상태만 두고, 상한은 여기서 단일 소스로 파생한다.
 * Stripe Price ID ↔ 플랜은 환경변수로 매핑 (대시보드에서 생성한 price_… 값).
 */
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

export type TeamPlanId = "free" | "basic" | "pro" | "team_plus";
/** Stripe 구독 상태를 팀 문서에 그대로 쓰기 좋게 정규화 (trialing 분리 → 미납/카드 UI 대응) */
export type TeamBillingStatus = "active" | "trialing" | "past_due" | "canceled";

/** 멤버 상한 (team_plus 는 실질 무제한으로 큰 값) */
export const PLAN_MEMBER_LIMITS: Record<TeamPlanId, number> = {
  free: 15,
  basic: 30,
  pro: 50,
  team_plus: 100000,
};

export function normalizeTeamPlan(plan: unknown): TeamPlanId {
  const p = typeof plan === "string" ? plan.trim().toLowerCase() : "";
  if (p === "basic" || p === "pro" || p === "team_plus") return p;
  return "free";
}

export function normalizeBillingStatus(raw: unknown): TeamBillingStatus {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "trialing" || v === "past_due" || v === "canceled") return v;
  return "active";
}

/** 유료 기능·페이월: trialing 도 결제 완료 전 트라이얼로 취급해 대개 허용 */
export function isBillingActiveForPaidFeatures(status: unknown): boolean {
  const s = normalizeBillingStatus(status);
  return s === "active" || s === "trialing";
}

export function getMemberLimitForPlan(plan: TeamPlanId): number {
  return PLAN_MEMBER_LIMITS[plan] ?? PLAN_MEMBER_LIMITS.free;
}

/**
 * teams.memberCount(비정규화, syncTeamMembers 등에서 유지) 기준으로 플랜 상한 검사.
 * 초과 시 failed-precondition — Callable / 스케줄러 등 서버 경로에서 호출.
 */
export async function assertTeamMemberCountWithinPlan(teamId: string): Promise<void> {
  const db = admin.firestore();
  const snap = await db.doc(`teams/${teamId}`).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  }
  const d = snap.data() || {};
  const plan = normalizeTeamPlan(d.plan);
  const limit = getMemberLimitForPlan(plan);
  const memberCount = Math.floor(Number(d.memberCount ?? 0));
  if (!Number.isFinite(memberCount) || memberCount < 0) {
    throw new HttpsError("failed-precondition", "팀 인원 정보를 확인할 수 없습니다.");
  }
  if (memberCount > limit) {
    throw new HttpsError(
      "failed-precondition",
      "현재 플랜의 멤버 상한을 초과했습니다. 플랜을 업그레이드한 뒤 다시 시도해 주세요."
    );
  }
}

/** Stripe Price ID → 플랜 (환경변수만 수정하면 됨, Webhook/Checkout 공통) */
export function getStripePriceIdToPlanMap(): Record<string, TeamPlanId> {
  const map: Record<string, TeamPlanId> = {};
  const basic = (process.env.STRIPE_PRICE_BASIC || "").trim();
  const pro = (process.env.STRIPE_PRICE_PRO || "").trim();
  const teamPlus = (process.env.STRIPE_PRICE_TEAM_PLUS || "").trim();
  if (basic) map[basic] = "basic";
  if (pro) map[pro] = "pro";
  if (teamPlus) map[teamPlus] = "team_plus";
  return map;
}

/** Stripe Checkout line item 의 price id → 플랜 */
export function resolvePlanFromStripePriceId(priceId: string): TeamPlanId | null {
  const id = (priceId || "").trim();
  if (!id) return null;
  return getStripePriceIdToPlanMap()[id] ?? null;
}

export function mapStripeSubscriptionStatus(status: string | undefined): TeamBillingStatus {
  const s = (status || "").trim();
  if (s === "trialing") return "trialing";
  if (s === "active") return "active";
  /** 첫 결제 대기·미수 — 카드 갱신/결제 유도 UI에 사용 */
  if (s === "past_due" || s === "unpaid" || s === "incomplete") return "past_due";
  /** 일시중지 구독은 과금/접근 정책은 제품에서 별도 정의 가능 — 기본은 paid 로 간주 */
  if (s === "paused") return "active";
  return "canceled";
}

export function subscriptionEndedOnStripe(status: string | undefined): boolean {
  const s = (status || "").trim();
  return s === "canceled" || s === "incomplete_expired";
}

const PLAN_ORDER: TeamPlanId[] = ["free", "basic", "pro", "team_plus"];

export function isPlanAtLeast(plan: TeamPlanId, min: TeamPlanId): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(min);
}

/** 클라이언트 `canUseBulkFeeReminders` 와 동일 — 스케줄러·Callable에서 우회 방지 */
export function teamEntitledForBulkFeeReminders(team: Record<string, unknown> | undefined): boolean {
  if (!team) return false;
  return (
    isBillingActiveForPaidFeatures(team.billingStatus) && isPlanAtLeast(normalizeTeamPlan(team.plan), "basic")
  );
}

/** 클라이언트 `canUseMonthlyFeeReportPremium` 와 동일 */
export function teamEntitledForMonthlyFeeReportPremium(team: Record<string, unknown> | undefined): boolean {
  if (!team) return false;
  return (
    isBillingActiveForPaidFeatures(team.billingStatus) && isPlanAtLeast(normalizeTeamPlan(team.plan), "pro")
  );
}

/** `generateMonthlyReport` 등에서 throw — 스케줄러는 메시지로 스킵 카운트 */
export const PLAN_NOT_ENTITLED_MONTHLY_REPORT = "PLAN_NOT_ENTITLED_MONTHLY_REPORT";

export function assertTeamEntitledForMonthlyFeeReportPremium(team: Record<string, unknown>): void {
  if (!teamEntitledForMonthlyFeeReportPremium(team)) {
    throw new Error(PLAN_NOT_ENTITLED_MONTHLY_REPORT);
  }
}

/** Stripe past_due 이후 유예 종료 시 서버·클라이언트가 동일하게 참조하는 제한 플래그 */
export function isTeamBillingRestricted(team: Record<string, unknown> | null | undefined): boolean {
  if (!team) return false;
  return team.billingRestricted === true;
}

export function assertTeamNotBillingRestricted(team: Record<string, unknown> | undefined): void {
  if (isTeamBillingRestricted(team)) {
    throw new HttpsError(
      "failed-precondition",
      "결제 미납으로 일부 기능이 제한되었습니다. 결제를 완료하면 자동으로 해제됩니다."
    );
  }
}
