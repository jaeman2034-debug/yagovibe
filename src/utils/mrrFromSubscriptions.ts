import type { SubscriptionDoc } from "@/types/billing";

function statusLower(s: string | undefined) {
    return String(s || "").toLowerCase();
}

/**
 * MRR = **active** 구독의 **월 환산** 금액 합 (권장 운영 정의)
 * - `cancel_at_period_end` 는 status active 유지 → 포함
 * - `trialing` / `incomplete` / `past_due` / `canceled` — 제외
 */
export function calculateMRRActiveOnly(subscriptions: SubscriptionDoc[]): number {
    return subscriptions
        .filter((s) => statusLower(s.status) === "active")
        .reduce(
            (sum, s) =>
                sum + normalizeMonthlyAmount(s.amount || 0, s.interval || "month"),
            0
        );
}

/** `active` + `past_due` (리스크 수금 뷰; 운영 MRR과 별도) */
export function calculateMRRWithPastDue(subscriptions: SubscriptionDoc[]): number {
    return subscriptions
        .filter((s) => {
            const st = statusLower(s.status);
            return st === "active" || st === "past_due";
        })
        .reduce(
            (sum, s) =>
                sum + normalizeMonthlyAmount(s.amount || 0, s.interval || "month"),
            0
        );
}

/**
 * MRR (기본: `active`만, 옵션으로 `past_due` 포함)
 * `SubscriptionDoc.interval`은 웹훅 `billingInterval`과 동기화(없으면 month)
 */
export function calculateMRR(
    subscriptions: SubscriptionDoc[],
    options?: { includePastDue?: boolean }
): number {
    if (options?.includePastDue) {
        return calculateMRRWithPastDue(subscriptions);
    }
    return calculateMRRActiveOnly(subscriptions);
}

/**
 * YAGO: 월/연 단위. Stripe `interval`이 생기면 여기에 연동
 */
export function normalizeMonthlyAmount(
    amount: number,
    interval: "month" | "year"
): number {
    if (!Number.isFinite(amount) || amount < 0) return 0;
    if (interval === "year") return amount / 12;
    return amount;
}
