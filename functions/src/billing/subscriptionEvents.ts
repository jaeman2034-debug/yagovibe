/**
 * Stripe 웹훅 → `subscriptions` 미러 반영 후 **불변 이벤트 로그** (`subscription_events`).
 * 정확 churn·retention·cohort 집계의 입력으로 사용 (일일 metrics 근사치 보완).
 */
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import type Stripe from "stripe";
import { subscriptionLineToMrrFields } from "../lib/stripeMrr";

const COL = "subscription_events";

export const SUBSCRIPTION_EVENT_TYPES = {
  CREATED: "created",
  TRIAL_STARTED: "trial_started",
  ACTIVATED: "activated",
  RENEWED: "renewed",
  CANCELED: "canceled",
} as const;

export type SubscriptionLifecycleEventType =
  (typeof SUBSCRIPTION_EVENT_TYPES)[keyof typeof SUBSCRIPTION_EVENT_TYPES];

function periodEndMs(sub: Stripe.Subscription): number | null {
  return typeof sub.current_period_end === "number" ? sub.current_period_end * 1000 : null;
}

function tsMillis(v: unknown): number | null {
  if (v && typeof v === "object" && "toMillis" in v) {
    return (v as admin.firestore.Timestamp).toMillis();
  }
  return null;
}

/**
 * 이전 미러 스냅샷 vs Stripe 구독으로 의미 있는 전이만 기록 (중복·잡음 최소화)
 */
export function inferSubscriptionLifecycleEvent(
  before: Record<string, unknown> | null,
  sub: Stripe.Subscription,
  afterStatus: string
): SubscriptionLifecycleEventType | null {
  const beforeStatus =
    before && typeof before.status === "string" && before.status.length > 0 ? String(before.status) : null;
  const afterEnd = periodEndMs(sub);
  const beforeEnd = tsMillis(before?.currentPeriodEnd);

  if (!beforeStatus) {
    if (afterStatus === SUBSCRIPTION_EVENT_TYPES.CANCELED) {
      return SUBSCRIPTION_EVENT_TYPES.CANCELED;
    }
    if (afterStatus === "trialing") {
      return SUBSCRIPTION_EVENT_TYPES.TRIAL_STARTED;
    }
    return SUBSCRIPTION_EVENT_TYPES.CREATED;
  }
  if (afterStatus === SUBSCRIPTION_EVENT_TYPES.CANCELED && beforeStatus !== SUBSCRIPTION_EVENT_TYPES.CANCELED) {
    return SUBSCRIPTION_EVENT_TYPES.CANCELED;
  }
  if (afterStatus === "trialing" && beforeStatus !== "trialing") {
    return SUBSCRIPTION_EVENT_TYPES.TRIAL_STARTED;
  }
  /** 미러는 Stripe `incomplete` 등을 `past_due`로 저장 — 유료 전환은 비-active → active */
  if (
    afterStatus === "active" &&
    beforeStatus !== "active" &&
    beforeStatus !== SUBSCRIPTION_EVENT_TYPES.CANCELED
  ) {
    return SUBSCRIPTION_EVENT_TYPES.ACTIVATED;
  }
  if (
    afterStatus === "active" &&
    beforeStatus === "active" &&
    beforeEnd != null &&
    afterEnd != null &&
    afterEnd > beforeEnd + 60_000
  ) {
    return SUBSCRIPTION_EVENT_TYPES.RENEWED;
  }
  return null;
}

function safeEventDocId(stripeEventId: string, subscriptionId: string, type: string): string {
  const raw = `${stripeEventId}__${subscriptionId}__${type}`;
  if (raw.length <= 800) return raw;
  return raw.slice(0, 800);
}

export async function appendSubscriptionLifecycleEvent(params: {
  db: admin.firestore.Firestore;
  subscription: Stripe.Subscription;
  before: Record<string, unknown> | null;
  orgId: string | null;
  teamId: string | null;
  sourceEvent: string | null;
  afterStatus: string;
  stripeEvent: { eventId: string; eventCreated: number } | null;
}): Promise<void> {
  const type = inferSubscriptionLifecycleEvent(params.before, params.subscription, params.afterStatus);
  if (!type) {
    return;
  }

  const subId = params.subscription.id;
  const docId =
    params.stripeEvent?.eventId && String(params.stripeEvent.eventId).trim().length > 0
      ? safeEventDocId(String(params.stripeEvent.eventId).trim(), subId, type)
      : params.db.collection(COL).doc().id;

  const customerId =
    typeof params.subscription.customer === "string"
      ? params.subscription.customer
      : params.subscription.customer?.id ?? null;

  const mrrFields = subscriptionLineToMrrFields(params.subscription);
  const { price, currency, billingInterval } = (() => {
    const firstPrice = params.subscription.items.data[0]?.price;
    const unitAmount = typeof firstPrice?.unit_amount === "number" ? firstPrice.unit_amount : 0;
    const priceCurrency =
      (typeof firstPrice?.currency === "string" && firstPrice.currency.trim().toUpperCase()) ||
      (typeof params.subscription.currency === "string" && params.subscription.currency.trim().toUpperCase()) ||
      "KRW";
    const intv = firstPrice?.recurring?.interval;
    const billingInterval: "month" | "year" = intv === "year" ? "year" : "month";
    return { price: Math.max(0, unitAmount), currency: priceCurrency, billingInterval };
  })();

  const occurredAt: Timestamp | FieldValue =
    params.stripeEvent != null
      ? Timestamp.fromMillis(params.stripeEvent.eventCreated * 1000)
      : FieldValue.serverTimestamp();

  const ref = params.db.doc(`${COL}/${docId}`);
  await ref.set(
    {
      subscriptionId: subId,
      customerId,
      orgId: params.orgId,
      teamId: params.teamId,
      type,
      statusBefore: params.before && typeof params.before.status === "string" ? params.before.status : null,
      statusAfter: params.afterStatus,
      price,
      currency,
      billingInterval,
      mrr: mrrFields?.mrr ?? null,
      mrrCurrency: mrrFields?.billingCurrency ?? null,
      sourceEvent: params.sourceEvent,
      stripeEventId: params.stripeEvent?.eventId ?? null,
      stripeEventCreated: params.stripeEvent?.eventCreated ?? null,
      occurredAt,
      recordedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logger.info("subscription_event_recorded", {
    docId,
    subscriptionId: subId,
    type,
    orgId: params.orgId,
    stripeEventId: params.stripeEvent?.eventId ?? null,
  });
}
