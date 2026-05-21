import type { OrgForBilling, SubscriptionDoc } from "@/types/billing";
import { resolveOrgBilling } from "@/utils/resolveOrgBilling";

export type OrgListKpi = {
    totalSubscriptions: number;
    trial: number;
    active: number;
    past_due: number;
    /** Checkout 미완/만료·파싱 실패 등( Trial 과 분리) */
    incomplete: number;
    canceled: number;
    /** MRR는 전역 `subscriptions` + `calculateMRR` — 조직 루프와 합이 다를 수 있음 */
    mrr: number;
};

/**
 * Trial / Active / Past Due / Incomplete(결제 실패) / Canceled
 * `org.billing` 는 subscription 없을 때만 사용 (`resolveOrgBilling` 규칙)
 */
function bucketFromResolved(
    status: string,
    source: "subscription" | "org"
): "trialing" | "active" | "past_due" | "incomplete" | "canceled" | null {
    const s = String(status || "")
        .trim()
        .toLowerCase();
    if (s === "free" && source === "org") return null;
    if (s === "incomplete" || s === "incomplete_expired") return "incomplete";
    if (s === "active") return "active";
    if (s === "trialing" || s === "trial") return "trialing";
    if (s === "past_due" || s === "unpaid" || s === "paused") return "past_due";
    if (s === "canceled" || s === "cancelled") return "canceled";
    if (s === "free" || s === "unknown" || s === "") return null;
    return null;
}

export function calculateOrgListKpi(
    orgs: OrgForBilling[],
    subscriptionsByOrgId: Map<string, SubscriptionDoc>
): OrgListKpi {
    const result: OrgListKpi = {
        totalSubscriptions: 0,
        trial: 0,
        active: 0,
        past_due: 0,
        incomplete: 0,
        canceled: 0,
        mrr: 0,
    };

    for (const org of orgs) {
        const orgKey = String(org.id ?? "").trim();
        const sub = orgKey ? subscriptionsByOrgId.get(orgKey) : undefined;
        const hasSubRecord = Boolean(sub);
        const hasLegacyStripe = Boolean(String(org.billing?.stripeSubscriptionId || "").trim());

        const r = resolveOrgBilling(org, subscriptionsByOrgId);
        // KPI 버킷·MRR(별도)은 Stripe `r.status`만 — `r.uiStatusLabel`·cancel 예정은 배제
        const b = bucketFromResolved(r.status, r.source);
        const hasStatusBucket = b !== null;

        /** `subscriptions` 미러가 아직 없어도 org 캐시( Stripe 단계)가 trialing|active|…이면 "구독 1건"으로 맞춤 — 총 구독 vs 활성 불일치 방지 */
        if (hasSubRecord || hasLegacyStripe || hasStatusBucket) {
            result.totalSubscriptions += 1;
        }

        if (b === "trialing") result.trial += 1;
        if (b === "active") result.active += 1;
        if (b === "past_due") result.past_due += 1;
        if (b === "incomplete") result.incomplete += 1;
        if (b === "canceled") result.canceled += 1;
    }

    return result;
}
