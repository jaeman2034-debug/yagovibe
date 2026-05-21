import type { SubscriptionDoc } from "@/types/billing";
import type { UiState } from "@/types/billingPolicy";

/** Stripe/미러에서 올 수 있는 필드 (camel + snake) */
type StripeSubLike = {
    status?: string;
    cancelAtPeriodEnd?: boolean;
    cancel_at_period_end?: boolean;
};

function resolveCancelAtEnd(sub: StripeSubLike): boolean {
    return sub.cancelAtPeriodEnd === true || sub.cancel_at_period_end === true;
}

function normStatus(raw: unknown): string {
    return String(raw || "")
        .trim()
        .toLowerCase();
}

/**
 * Stripe `subscription` → UI·KPI 정책 (`UiState`)
 * - `status`는 Stripe enum 그대로 해석( active는 cancel 예정이어도 "active" UiStatus )
 * - MRR: `includeInMRR === true` 인 구독만 `calculateMRR`이 합산(별도)
 */
export function mapStripeToUiState(sub: StripeSubLike): UiState {
    const s = normStatus(sub.status);
    const cap = resolveCancelAtEnd(sub);

    if (s === "active") {
        if (cap) {
            return {
                status: "active",
                label: "Active (cancel scheduled)",
                isPaid: true,
                includeInMRR: true,
            };
        }
        return {
            status: "active",
            label: "Active",
            isPaid: true,
            includeInMRR: true,
        };
    }

    if (s === "trialing" || s === "trial") {
        if (cap) {
            return {
                status: "trial",
                label: "Trial (cancel scheduled)",
                isPaid: true,
                includeInMRR: false,
            };
        }
        return {
            status: "trial",
            label: "Trial",
            isPaid: true,
            includeInMRR: false,
        };
    }

    if (s === "past_due") {
        return {
            status: "past_due",
            label: "Past Due",
            isPaid: true,
            includeInMRR: false,
        };
    }

    if (s === "canceled" || s === "cancelled") {
        return {
            status: "canceled",
            label: "Canceled",
            isPaid: false,
            includeInMRR: false,
        };
    }

    if (s === "unpaid") {
        return {
            status: "unpaid",
            label: "Unpaid",
            isPaid: false,
            includeInMRR: false,
        };
    }

    if (s === "incomplete") {
        return {
            status: "incomplete",
            label: "Incomplete",
            isPaid: false,
            includeInMRR: false,
        };
    }

    if (s === "incomplete_expired") {
        return {
            status: "failed",
            label: "Failed",
            isPaid: false,
            includeInMRR: false,
        };
    }

    if (s === "paused") {
        return {
            status: "paused",
            label: "Paused",
            isPaid: false,
            includeInMRR: false,
        };
    }

    return {
        status: "paused",
        label: "Unknown",
        isPaid: false,
        includeInMRR: false,
    };
}

/** Firestore `SubscriptionDoc` → 정책 `UiState` */
export function mapSubscriptionDocToUiState(sub: SubscriptionDoc): UiState {
    return mapStripeToUiState({
        status: sub.status,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    });
}
