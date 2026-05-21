/**
 * 결제/구독 UI — `subscriptions` 단일 소스 우선, `orgs.billing` 는 fallback
 */

export type SubscriptionStatus =
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "incomplete"
    | "incomplete_expired"
    | "paused";

/** `resolveOrgBilling` 입력 (listOrgs 등 최소 필드) */
export interface OrgForBilling {
    id: string;
    name?: string;
    planId?: "free" | "pro" | "enterprise" | string;
    billing?: {
        status?: string;
        plan?: string;
        customerId?: string;
        defaultPayment?: string;
        stripeSubscriptionId?: string;
        billingUnitAmount?: number;
        mrr?: number;
    };
}

/** listOrgs / OrgBillingCenter 테이블 row */
export interface OrgListRow extends OrgForBilling {
    planId: "free" | "pro" | "enterprise";
    limits?: {
        rpm?: number;
        rpd?: number;
        storageGb?: number;
        seats?: number;
        priority?: number;
    };
    features?: {
        [key: string]: boolean;
    };
}

export interface SubscriptionDoc {
    id: string;
    orgId: string;
    status: SubscriptionStatus;
    plan?: string;
    priceId?: string;
    currency?: string;
    /** Firestore `price` 또는 `amount` (소액/Stripe unit_amount) */
    amount: number;
    /**
     * Stripe Price `recurring.interval` (웹훅 `billingInterval`) — MRR 월 환산용
     * 없으면 `"month"` 가정
     */
    interval?: "month" | "year";
    currentPeriodEnd?: unknown;
    cancelAtPeriodEnd?: boolean;
    createdAt?: unknown;
    updatedAt?: unknown;
    /** `updatedAt` / `createdAt` 비교용 (클라이언트) */
    updatedAtMs: number;
    /** Functions가 기록: Stripe `Event.created`(초) — 늦은 웹훅 구분 */
    lastStripeEventCreated?: number;
    lastStripeEventId?: string;
}

export interface ResolvedBilling {
    source: "subscription" | "org";
    /**
     * Stripe `subscription.status` (또는 org 캐시). KPI·버킷·MRR 집계는 **이 값만** 사용.
     * `cancel_at_period_end`가 있어도 status는 `"active"`로 유지 — "Canceling"으로 바꾸지 않는다.
     */
    status: string;
    plan: string;
    isPaid: boolean;
    /** `plan` / 요약 한 줄 (보조) */
    label: string;
    /**
     * 배지·설명용 문구. KPI/MRR/필터에는 쓰지 않는다.
     * 취소 예정은 **보조 표시**이지 별도 lifecycle status가 아님.
     */
    uiStatusLabel: string;
    /** Stripe `cancel_at_period_end` — status와 별도 플래그(보조) */
    cancelAtPeriodEnd?: boolean;
}

/**
 * `billing_metrics_daily/{YYYY-MM-DD}` — Cloud Functions `billingMetricsDaily`
 * `date`는 반드시 `YYYY-MM-DD` 문자열(서울 달력). Timestamp와 혼용하지 않는다.
 */
export interface BillingMetricDailyDoc {
    date: string;
    mrr: number;
    activeCount: number;
    newCount: number;
    churnCount: number;
    /** 서울일 기준 `subscription_events`(type=canceled) 건수 — `churnCount`(근사) 보완 */
    churnEventsDay?: number;
    windowDays?: number;
    computedAt?: unknown;
}

/** `subscription_events` — 웹훅이 `upsertSubscriptionMirror` 후 append (Functions 전용 쓰기) */
export const SUBSCRIPTION_EVENT_TYPES = {
    CREATED: "created",
    TRIAL_STARTED: "trial_started",
    ACTIVATED: "activated",
    RENEWED: "renewed",
    CANCELED: "canceled",
} as const;

export type SubscriptionLifecycleEventType =
    (typeof SUBSCRIPTION_EVENT_TYPES)[keyof typeof SUBSCRIPTION_EVENT_TYPES];

export interface SubscriptionLifecycleEventDoc {
    subscriptionId: string;
    customerId?: string | null;
    orgId?: string | null;
    teamId?: string | null;
    type: SubscriptionLifecycleEventType;
    statusBefore?: string | null;
    statusAfter: string;
    price?: number;
    currency?: string;
    billingInterval?: "month" | "year";
    mrr?: number | null;
    mrrCurrency?: string | null;
    sourceEvent?: string | null;
    stripeEventId?: string | null;
    stripeEventCreated?: number | null;
    occurredAt?: unknown;
    recordedAt?: unknown;
}
