import type { OrgForBilling, ResolvedBilling, SubscriptionDoc } from "@/types/billing";
import { getBillingStatusDisplayText } from "@/utils/billingBadge";

const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * 1순위: `subscriptions` (Stripe 미러)
 * 2순위: `orgs.billing` (legacy / 마이그레이션) — **맵에 문서가 없을 때만**
 *
 * - `subscriptions`에 org 문서가 있으면( `incomplete` 포함) **무조건** subscription 경로.
 *   `isPaid === false`여도 `free`/`trial` org fallback **금지** (Src=Live 유지).
 * - 잘못된 패턴: `org.billing?.status || sub?.status`
 * - 올바른 패턴: `sub?.status` (없을 때만) `org.billing`
 */
export function resolveOrgBilling(
    org: OrgForBilling,
    subscriptionsByOrgId: Map<string, SubscriptionDoc>
): ResolvedBilling {
    const orgKey = String(org.id ?? "")
        .trim();
    const sub = subscriptionsByOrgId.get(orgKey);

    if (sub) {
        const plan = sub.plan || org.planId || "pro";
        const status = String(sub.status || "unknown");
        const st = status.toLowerCase();
        const cap = sub.cancelAtPeriodEnd === true;
        const ui = getBillingStatusDisplayText(status, { cancelAtPeriodEnd: cap });
        return {
            source: "subscription",
            status,
            plan: String(plan),
            isPaid: PAID_STATUSES.has(st),
            label: `${String(plan)} / ${ui}`,
            uiStatusLabel: ui,
            cancelAtPeriodEnd: cap || undefined,
        };
    }

    const fallbackStatus = org.billing?.status != null && String(org.billing.status).trim() !== ""
        ? String(org.billing.status)
        : "free";
    const fallbackPlan = org.billing?.plan != null && String(org.billing.plan).trim() !== ""
        ? String(org.billing.plan)
        : org.planId != null
          ? String(org.planId)
          : "free";

    const uiFb = getBillingStatusDisplayText(fallbackStatus);
    return {
        source: "org",
        status: fallbackStatus,
        plan: fallbackPlan,
        isPaid: false,
        label: `${fallbackPlan} / ${uiFb}`,
        uiStatusLabel: uiFb,
    };
}
