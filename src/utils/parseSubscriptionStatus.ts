import type { SubscriptionStatus } from "@/types/billing";

const KNOWN = new Set([
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "incomplete",
    "incomplete_expired",
    "paused",
]);

/**
 * Stripe `subscription.status` / Firestore 미러 문자열 → `SubscriptionStatus`
 * null/빈 값·미지원 값은 MRR/과금에서 제외되도록 `incomplete` 쪽에 가깝게 둔다(보수적)
 */
export function parseSubscriptionStatus(raw: unknown): SubscriptionStatus {
    const s0 = String(raw == null ? "" : raw)
        .trim()
        .toLowerCase()
        .replace(/-/g, "_");
    if (s0 === "trial") return "trialing";
    if (s0 === "" || s0 === "null" || s0 === "undefined") {
        return "incomplete";
    }
    if (KNOWN.has(s0)) {
        return s0 as SubscriptionStatus;
    }
    if (import.meta.env.DEV) {
        console.warn("[parseSubscriptionStatus] unknown status, treating as incomplete:", raw);
    }
    return "incomplete";
}
