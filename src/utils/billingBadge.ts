import type { SubscriptionDoc } from "@/types/billing";

export type BillingBadgeTone = "green" | "blue" | "yellow" | "gray" | "red" | "violet";

export function getBillingBadge(status: string): {
    text: string;
    tone: BillingBadgeTone;
    className: string;
} {
    const s = String(status || "")
        .trim()
        .toLowerCase();
    switch (s) {
        case "active":
            return {
                text: "Active",
                tone: "green",
                className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
            };
        case "trialing":
        case "trial":
            return {
                text: "Trial",
                tone: "violet",
                className: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
            };
        case "past_due":
            return {
                text: "Past Due",
                tone: "yellow",
                className: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
            };
        case "canceled":
        case "cancelled":
            return {
                text: "Canceled",
                tone: "gray",
                className: "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-slate-200",
            };
        case "unpaid":
            return {
                text: "Unpaid",
                tone: "red",
                className: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
            };
        case "incomplete":
        case "incomplete_expired":
            return {
                text: s === "incomplete" ? "Failed · Incomplete" : "Failed · Expired",
                tone: "red",
                className: "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
            };
        case "paused":
            return {
                text: "Paused",
                tone: "gray",
                className: "bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-slate-300",
            };
        case "free":
            return { text: "Free", tone: "gray", className: "bg-slate-100 text-slate-600 dark:bg-zinc-800" };
        default:
            return {
                text: s ? s : "Unknown",
                tone: "gray",
                className: "bg-slate-200 text-slate-600 dark:bg-zinc-800",
            };
    }
}

/**
 * 화면용 상태 문구 (KPI/집계에는 사용 금지 — `status` 필드 사용)
 * `cancel_at_period_end`는 **속성**이지 Stripe status를 바꾸지 않는다.
 */
export function getBillingStatusDisplayText(
    status: string,
    options?: { cancelAtPeriodEnd?: boolean }
): string {
    const s = String(status || "")
        .trim()
        .toLowerCase();
    if (options?.cancelAtPeriodEnd) {
        if (s === "active") return "Active (취소 예정)";
        if (s === "trialing" || s === "trial") return "Trial (취소 예정)";
    }
    return getBillingBadge(status).text;
}

/**
 * `status` + `cancel_at_period_end` (Stripe) 조합
 * - `active` + 기간말 취소 → KPI는 여전히 `active`, MRR·Active 버킷에 포함(정책)
 */
export function getSubscriptionRowBadge(
    sub: SubscriptionDoc | undefined,
    resolvedStatusWhenNoSub: string
): { text: string; tone: BillingBadgeTone; className: string } {
    if (!sub) {
        return getBillingBadge(resolvedStatusWhenNoSub);
    }
    const st = String(sub.status).toLowerCase();
    if (sub.cancelAtPeriodEnd && (st === "active" || st === "trialing")) {
        const isActive = st === "active";
        return {
            text: getBillingStatusDisplayText(String(sub.status), { cancelAtPeriodEnd: true }),
            tone: isActive ? "green" : "violet",
            className: isActive
                ? "bg-emerald-100 text-emerald-900 ring-1 ring-amber-400/70 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-violet-100 text-violet-900 ring-1 ring-amber-400/70 dark:bg-violet-950/40 dark:text-violet-200",
        };
    }
    return getBillingBadge(String(sub.status));
}
