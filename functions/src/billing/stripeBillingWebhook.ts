/**
 * Stripe → Firestore 반영 (Checkout 완료 · 구독 갱신/해지).
 *
 * 환경변수/Secret:
 * - STRIPE_SECRET_KEY_V2 (배포) — 로컬/에뮬은 `STRIPE_SECRET_KEY` 폴백( createCheckoutSession / verify와 동일 )
 * - STRIPE_WEBHOOK_SECRET
 *
 * Stripe CLI 로컬: stripe listen --forward-to localhost:5001/프로젝트/asia-northeast3/stripeBillingWebhook
 * (에뮬레이터 포트는 firebase.json 기준)
 *
 * Express raw body 로 서명 검증 — 반드시 json 파서보다 먼저 등록.
 *
 * **Firestore TTL(선택)**: `stripe_events` 수집에 `ttlExpireAt` 필드(최종화 시 +90일)를 둡니다.
 * 콘솔에서 해당 필드에 TTL을 켜면 idempotency 로그가 자동으로 정리됩니다.
 */
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Stripe from "stripe";
import {
  mapStripeSubscriptionStatus,
  normalizeBillingStatus,
  resolvePlanFromStripePriceId,
  subscriptionEndedOnStripe,
} from "../lib/teamPlan";
import { fetchSubscriptionWithPriceDetails, subscriptionLineToMrrFields } from "../lib/stripeMrr";
import { teamDocumentActivityPatch } from "../lib/teamActivityTouch";
import { resolveTeamCaptainUid } from "../lib/resolveTeamCaptainUid";
import {
  enqueueBillingLifecycleNotification,
  PAST_DUE_GRACE_PERIOD_MS,
  teamBillingDeepLink,
} from "../lib/teamBillingPastDue";
import { applySubscriptionToOrg } from "./applyOrgStripeSubscription";
import { appendSubscriptionLifecycleEvent } from "./subscriptionEvents";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
/** Webhook idempotency (event.id) — `stripeEvents` 는 구버전 `completed` 조회용 */
const STRIPE_EVENT_LEASE = "stripe_events";
const STRIPE_EVENT_LEASE_LEGACY = "stripeEvents";
const ORPHAN_SUBS = "orphan_subscriptions";
/** 이벤트/고아 추적 — Firestore Native TTL: 필드 `ttlExpireAt` (권장 30~90일) */
const STRIPE_EVENT_TTL_DAYS = 90;
const ORPHAN_SUB_TTL_DAYS = 90;

function ttlTimestampDaysFromNow(days: number): admin.firestore.Timestamp {
  const ms = days * 24 * 60 * 60 * 1000;
  return admin.firestore.Timestamp.fromMillis(Date.now() + ms);
}

/** `processing` 상태가 이 시간 지나도 끝나지 않으면 재획득 (워커 crash 대비) */
const STALE_PROCESSING_MS = 5 * 60 * 1000;
type MirrorBillingStatus = "trialing" | "active" | "past_due" | "canceled";
const STRIPE_SECRET_KEY_V2 = defineSecret("STRIPE_SECRET_KEY_V2");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const SLACK_WEBHOOK_URL = defineSecret("SLACK_WEBHOOK_URL");

function isStripeConnectionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const maybeType =
    err && typeof err === "object" && "type" in err ? String((err as { type?: unknown }).type || "") : "";
  return maybeType === "StripeConnectionError" || /connection to Stripe/i.test(message);
}

async function sendSlackAlert(text: string): Promise<void> {
  const webhookUrl = String(SLACK_WEBHOOK_URL.value() || "").trim();
  if (!webhookUrl) return;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      logger.warn("[stripeBillingWebhook] slack alert failed", {
        status: res.status,
        statusText: res.statusText,
      });
    }
  } catch (e) {
    logger.warn("[stripeBillingWebhook] slack alert request error", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

function getStripe(): Stripe {
  const key = String(
    STRIPE_SECRET_KEY_V2.value() || (process.env.STRIPE_SECRET_KEY || "").trim() || ""
  ).trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY_V2(또는 로컬 STRIPE_SECRET_KEY)가 설정되지 않았습니다.");
  }
  return new Stripe(key, { typescript: true });
}

function toBillingStatus(status: string | undefined): MirrorBillingStatus {
  return mapStripeSubscriptionStatus(status);
}

function getSubscriptionPriceFields(sub: Stripe.Subscription): {
  price: number;
  currency: string;
  /** MRR 월 환산 — `year`이면 amount/12 (클라이언트와 동일 규칙) */
  billingInterval: "month" | "year";
} {
  const firstPrice = sub.items.data[0]?.price;
  const unitAmount = typeof firstPrice?.unit_amount === "number" ? firstPrice.unit_amount : 0;
  const priceCurrency =
    (typeof firstPrice?.currency === "string" && firstPrice.currency.trim().toUpperCase()) ||
    (typeof sub.currency === "string" && sub.currency.trim().toUpperCase()) ||
    "KRW";
  const intv = firstPrice?.recurring?.interval;
  const billingInterval: "month" | "year" = intv === "year" ? "year" : "month";
  return { price: Math.max(0, unitAmount), currency: priceCurrency, billingInterval };
}

type SubscriptionMirrorContext = {
  orgId: string | null;
  teamId: string | null;
  sourceEvent: string | null;
};

/** Stripe `Event.created`(초) — 늦게 도착한 웹훅이 최신을 덮지 않도록 */
type StripeEventDispatchContext = {
  eventCreated: number;
  eventId: string;
};

type ClaimEventResult = "ok" | "duplicate_completed" | "duplicate_inflight";

type SubMirrorBuild = SubscriptionMirrorContext & { stripeEvent?: StripeEventDispatchContext };

/**
 * `stripe_events/{eventId}` — none → processing → completed | failed
 * - completed(구 `stripeEvents` 포함): 중복 200
 * - processing 5분 이내: 동시 재전송 200
 * - failed / deferred / stale processing: 재획득
 */
async function claimStripeWebhookEvent(event: Stripe.Event): Promise<ClaimEventResult> {
  const eventId = String(event.id || "").trim();
  if (!eventId) {
    return "ok";
  }
  const newRef = db.doc(`${STRIPE_EVENT_LEASE}/${eventId}`);
  const legRef = db.doc(`${STRIPE_EVENT_LEASE_LEGACY}/${eventId}`);

  const [legSnap] = await Promise.all([legRef.get()]);
  if (legSnap.exists && (legSnap.data() as { status?: string } | undefined)?.status === "completed") {
    return "duplicate_completed";
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(newRef);
    const d = snap.data() as
      | { status?: string; startedAt?: admin.firestore.Timestamp; completedAt?: admin.firestore.Timestamp }
      | undefined;

    if (snap.exists && d?.status === "completed") {
      return "duplicate_completed" as const;
    }

    if (snap.exists && d?.status === "processing" && d.startedAt) {
      const started = d.startedAt.toMillis();
      if (Date.now() - started < STALE_PROCESSING_MS) {
        return "duplicate_inflight" as const;
      }
    }

    tx.set(newRef, {
      type: event.type,
      apiVersion: event.api_version,
      stripeCreated: event.created,
      livemode: event.livemode,
      status: "processing",
      startedAt: FieldValue.serverTimestamp(),
      receivedAt: FieldValue.serverTimestamp(),
    });
    return "ok" as const;
  });
}

/**
 * `subscriptions/{subscriptionId}` — merge 필드 전부 여기서 생성. 웹훅은 `upsertSubscriptionMirror`만 호출.
 */
function buildSubscriptionMirrorPayload(sub: Stripe.Subscription, ctx: SubMirrorBuild): Record<string, unknown> {
  const { price, currency, billingInterval } = getSubscriptionPriceFields(sub);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const rawP = sub.items.data[0]?.price;
  const priceIdStr = typeof rawP === "string" ? rawP : rawP?.id;
  const planFromPrice = priceIdStr ? resolvePlanFromStripePriceId(priceIdStr) : null;
  return {
    subscriptionId: sub.id,
    customerId: customerId || null,
    orgId: ctx.orgId,
    teamId: ctx.teamId,
    status: toBillingStatus(sub.status),
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    price,
    currency,
    billingInterval,
    /** 팀/조직 UI가 `teams`·`subscriptions` 둘 중 하나만 늦게 맞을 때 — 클라 `useTeamBillingDoc`에서 사용 */
    plan: planFromPrice != null ? planFromPrice : null,
    priceId: priceIdStr || null,
    currentPeriodStart:
      typeof sub.current_period_start === "number"
        ? admin.firestore.Timestamp.fromMillis(sub.current_period_start * 1000)
        : null,
    currentPeriodEnd:
      typeof sub.current_period_end === "number"
        ? admin.firestore.Timestamp.fromMillis(sub.current_period_end * 1000)
        : null,
    stripeCreatedAt:
      typeof sub.created === "number" ? admin.firestore.Timestamp.fromMillis(sub.created * 1000) : null,
    sourceEvent: ctx.sourceEvent,
    updatedAt: FieldValue.serverTimestamp(),
    ...(ctx.stripeEvent
      ? {
          lastStripeEventCreated: ctx.stripeEvent.eventCreated,
          lastStripeEventId: ctx.stripeEvent.eventId,
        }
      : {}),
  };
}

type UpsertSubCtx = {
  orgId?: string | null;
  teamId?: string | null;
  sourceEvent?: string | null;
  stripeEvent?: StripeEventDispatchContext;
};

function strIdOrNull(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function orgTeamFromMirror(
  before: Record<string, unknown> | null
): { o: string | null; t: string | null } {
  if (!before) {
    return { o: null, t: null };
  }
  return { o: strIdOrNull(before.orgId), t: strIdOrNull(before.teamId) };
}

/**
 * Firestore `subscriptions` **단일 진입점** — `set(merge)`.
 * - `orgId`/`teamId`: **비어 있지 않은 ctx** → Stripe `metadata` → 기존 `subscriptions` 문서 (캐시)
 *   (이전: `ctx.orgId === null` 이어도 metadata 를 덮어써 orgId 를 잃음)
 * - `stripeEvent`가 있으면 `event.created`로 오래된 이벤트는 스킵
 * - org·team 둘 다 없으면 `orphan_subscriptions`에도 기록
 */
export async function upsertSubscriptionMirror(
  sub: Stripe.Subscription,
  ctx?: UpsertSubCtx
): Promise<"written" | "skipped_stale"> {
  const sourceEvent = ctx?.sourceEvent != null && ctx.sourceEvent !== "" ? String(ctx.sourceEvent) : null;
  const subRef = db.doc(`subscriptions/${sub.id}`);
  const existingSnap = await subRef.get();
  const before = existingSnap.exists ? (existingSnap.data() as Record<string, unknown>) : null;

  if (ctx?.stripeEvent && existingSnap.exists) {
    const last = (before as { lastStripeEventCreated?: number } | undefined)?.lastStripeEventCreated;
    if (typeof last === "number" && ctx.stripeEvent.eventCreated < last) {
      const existing = before as
        | { lastStripeEventCreated?: number; lastStripeEventId?: string }
        | undefined;
      logger.info("skipped_stale_subscription_update", {
        subscriptionId: sub.id,
        incoming: ctx.stripeEvent.eventCreated,
        existing: last,
        lastStripeEventId: existing?.lastStripeEventId ?? null,
        eventId: ctx.stripeEvent.eventId,
      });
      return "skipped_stale";
    }
  }

  const metaOrg = (String(sub.metadata?.orgId || "").trim() || null) as string | null;
  const metaTeam = (String(sub.metadata?.teamId || "").trim() || null) as string | null;
  const { o: mirrorOrg, t: mirrorTeam } = orgTeamFromMirror(before);
  const fromCtxOrg = strIdOrNull(ctx?.orgId);
  const fromCtxTeam = strIdOrNull(ctx?.teamId);
  const orgId = fromCtxOrg || metaOrg || mirrorOrg;
  const teamId = fromCtxTeam || metaTeam || mirrorTeam;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!orgId && !teamId) {
    logger.error("[stripeBillingWebhook] missing orgId and teamId for subscription", {
      subscriptionId: sub.id,
      customerId: customerId || null,
    });
    await db.doc(`${ORPHAN_SUBS}/${sub.id}`).set(
      {
        subscriptionId: sub.id,
        customerId: customerId || null,
        sourceEvent: sourceEvent || null,
        stripeEventCreated: ctx?.stripeEvent?.eventCreated ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ttlExpireAt: ttlTimestampDaysFromNow(ORPHAN_SUB_TTL_DAYS),
      },
      { merge: true }
    );
  }

  const payload = buildSubscriptionMirrorPayload(sub, {
    orgId,
    teamId,
    sourceEvent,
    stripeEvent: ctx?.stripeEvent,
  });
  await subRef.set(
    {
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const afterStatus = toBillingStatus(sub.status);
  try {
    await appendSubscriptionLifecycleEvent({
      db,
      subscription: sub,
      before,
      orgId,
      teamId,
      sourceEvent,
      afterStatus,
      stripeEvent: ctx?.stripeEvent
        ? { eventId: ctx.stripeEvent.eventId, eventCreated: ctx.stripeEvent.eventCreated }
        : null,
    });
  } catch (e) {
    logger.error("[stripeBillingWebhook] subscription_events append failed", {
      subscriptionId: sub.id,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  if (orgId && !teamId) {
    try {
      await applySubscriptionToOrg(getStripe(), orgId, sub);
    } catch (e) {
      logger.error("[stripeBillingWebhook] applySubscriptionToOrg after mirror failed", {
        orgId,
        subscriptionId: sub.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return "written";
}

async function recordPaymentMirror(
  invoice: Stripe.Invoice,
  ctx?: { orgId?: string | null; teamId?: string | null; sourceEvent?: string }
): Promise<void> {
  const id = String(invoice.id || "").trim();
  if (!id) return;
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription && typeof invoice.subscription === "object"
        ? (invoice.subscription as Stripe.Subscription).id
        : null;
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer && typeof invoice.customer === "object"
        ? (invoice.customer as Stripe.Customer).id
        : null;
  const amountPaid = typeof invoice.amount_paid === "number" ? invoice.amount_paid : 0;
  const currency = String(invoice.currency || "KRW").toUpperCase();
  await db.doc(`payments/${id}`).set(
    {
      paymentId: id,
      amount: amountPaid,
      currency,
      subscriptionId: subscriptionId || null,
      customerId: customerId || null,
      orgId: ctx?.orgId || null,
      teamId: ctx?.teamId || null,
      stripeCreatedAt:
        typeof invoice.created === "number"
          ? admin.firestore.Timestamp.fromMillis(invoice.created * 1000)
          : null,
      paid: invoice.paid === true,
      status: typeof invoice.status === "string" ? invoice.status : null,
      sourceEvent: ctx?.sourceEvent || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function applySubscriptionToTeam(teamId: string, sub: Stripe.Subscription): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);
  const teamSnap = await teamRef.get();
  const before = teamSnap.exists ? (teamSnap.data() as Record<string, unknown>) : {};
  const prevBilling = normalizeBillingStatus(before.billingStatus);

  const stripe = getStripe();
  const subFull = await fetchSubscriptionWithPriceDetails(stripe, sub.id, sub);

  const rawPrice = subFull.items.data[0]?.price;
  const priceIdStr = typeof rawPrice === "string" ? rawPrice : rawPrice?.id;
  const planFromPrice = priceIdStr ? resolvePlanFromStripePriceId(priceIdStr) : null;

  if (subscriptionEndedOnStripe(subFull.status)) {
    const hadPaidStripe =
      typeof before.stripeSubscriptionId === "string" && String(before.stripeSubscriptionId).trim().length > 0;

    const batch = db.batch();
    batch.set(
      teamRef,
      {
        plan: "free",
        billingStatus: "canceled",
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: FieldValue.delete(),
        currentPeriodEnd: FieldValue.delete(),
        pastDueSince: FieldValue.delete(),
        graceUntil: FieldValue.delete(),
        restrictedAt: FieldValue.delete(),
        lastPastDueNotifiedAt: FieldValue.delete(),
        lastPastDueReminderAt: FieldValue.delete(),
        lastRestrictionNotifiedAt: FieldValue.delete(),
        billingRestricted: false,
        billingRestrictionReason: FieldValue.delete(),
        mrr: FieldValue.delete(),
        billingUnitAmount: FieldValue.delete(),
        billingInterval: FieldValue.delete(),
        billingCurrency: FieldValue.delete(),
        lastPaymentFailedAt: FieldValue.delete(),
        lastPaymentSucceededAt: FieldValue.delete(),
        ...teamDocumentActivityPatch(),
      },
      { merge: true }
    );
    if (hadPaidStripe) {
      batch.set(db.collection("billingChurnEvents").doc(), {
        teamId,
        subscriptionId: String(before.stripeSubscriptionId),
        churnedAt: FieldValue.serverTimestamp(),
        fromBillingStatus: prevBilling,
      });
    }
    await batch.commit();
    return;
  }

  const nextBilling = mapStripeSubscriptionStatus(subFull.status);
  const wasRestricted = before.billingRestricted === true;
  const hadPastDueEpisode =
    before.pastDueSince != null &&
    typeof (before.pastDueSince as { toMillis?: () => number }).toMillis === "function";

  const patch: Record<string, unknown> = {
    stripeSubscriptionId: subFull.id,
    billingStatus: nextBilling,
    cancelAtPeriodEnd: subFull.cancel_at_period_end === true,
    ...teamDocumentActivityPatch(),
  };
  if (typeof subFull.current_period_end === "number") {
    patch.currentPeriodEnd = admin.firestore.Timestamp.fromMillis(subFull.current_period_end * 1000);
  }
  if (planFromPrice) {
    patch.plan = planFromPrice;
  }

  const mrrFields = subscriptionLineToMrrFields(subFull);
  if (mrrFields) {
    patch.mrr = mrrFields.mrr;
    patch.billingUnitAmount = mrrFields.billingUnitAmount;
    patch.billingInterval = mrrFields.billingInterval;
    patch.billingCurrency = mrrFields.billingCurrency;
  } else {
    patch.mrr = FieldValue.delete();
    patch.billingUnitAmount = FieldValue.delete();
    patch.billingInterval = FieldValue.delete();
    patch.billingCurrency = FieldValue.delete();
  }

  const isHealthy = nextBilling === "active" || nextBilling === "trialing";

  if (nextBilling === "past_due") {
    patch.lastPaymentFailedAt = FieldValue.serverTimestamp();
    if (!hadPastDueEpisode) {
      const nowTs = admin.firestore.Timestamp.now();
      patch.pastDueSince = nowTs;
      patch.graceUntil = admin.firestore.Timestamp.fromMillis(nowTs.toMillis() + PAST_DUE_GRACE_PERIOD_MS);
      patch.lastPastDueNotifiedAt = FieldValue.serverTimestamp();
    }
  } else if (isHealthy) {
    patch.lastPaymentSucceededAt = FieldValue.serverTimestamp();
    // past_due 에피소드 종료: 알림 타임스탬프도 삭제해야 재실패 시 Day3 알림이 다시 나간다.
    patch.pastDueSince = FieldValue.delete();
    patch.graceUntil = FieldValue.delete();
    patch.restrictedAt = FieldValue.delete();
    patch.lastPastDueNotifiedAt = FieldValue.delete();
    patch.lastPastDueReminderAt = FieldValue.delete();
    patch.lastRestrictionNotifiedAt = FieldValue.delete();
    patch.billingRestricted = false;
    patch.billingRestrictionReason = FieldValue.delete();
  }

  await teamRef.set(patch, { merge: true });

  if (prevBilling === "trialing" && nextBilling === "active") {
    try {
      await db.collection("billingConversionEvents").add({
        teamId,
        subscriptionId: subFull.id,
        convertedAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      logger.warn("[stripeBillingWebhook] billingConversionEvents add skipped", {
        teamId,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (isHealthy && wasRestricted) {
    try {
      const evRef = db.collection("billingRecoveryEvents").doc();
      const batch = db.batch();
      batch.set(evRef, {
        teamId,
        subscriptionId: subFull.id,
        recoveredAt: FieldValue.serverTimestamp(),
      });
      batch.set(
        db.doc("platformMetrics/current"),
        {
          recentRecoveredBillingTeams: FieldValue.increment(1),
        },
        { merge: true }
      );
      await batch.commit();
    } catch (e) {
      logger.warn("[stripeBillingWebhook] recovery event / lifetime increment skipped", {
        teamId,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const afterSnap = await teamRef.get();
  const after = afterSnap.exists ? (afterSnap.data() as Record<string, unknown>) : {};

  const teamName =
    (typeof after.name === "string" && after.name.trim()) ||
    (typeof after.teamName === "string" && after.teamName.trim()) ||
    "팀";
  const link = teamBillingDeepLink(teamId);

  if (nextBilling === "past_due" && !hadPastDueEpisode) {
    const captain = await resolveTeamCaptainUid(teamId, after).catch(() => null);
    const pd = after.pastDueSince;
    if (captain && pd && typeof (pd as admin.firestore.Timestamp).toMillis === "function") {
      const ep = (pd as admin.firestore.Timestamp).toMillis();
      await enqueueBillingLifecycleNotification({
        docId: `billing_past_due_day0_${teamId}_${ep}`,
        pushDedupKey: `billing_past_due_day0:${teamId}:${ep}`,
        teamId,
        captainUid: captain,
        notifType: "billing_past_due_day0",
        title: "[결제 실패]",
        body:
          `「${teamName}」 결제에 실패했습니다.\n` +
          `7일 내 결제 수단을 확인하지 않으면 일부 기능이 제한될 수 있습니다.\n` +
          `탭하면 팀 홈으로 이동합니다.`,
        link,
      });
    }
  } else if (isHealthy && wasRestricted) {
    const captain = await resolveTeamCaptainUid(teamId, after).catch(() => null);
    if (captain) {
      const dayBucket = String(Math.floor(Date.now() / 86400000));
      await enqueueBillingLifecycleNotification({
        docId: `billing_recovered_${teamId}_${subFull.id}_${dayBucket}`,
        pushDedupKey: `billing_recovered:${teamId}:${subFull.id}:${dayBucket}`,
        teamId,
        captainUid: captain,
        notifType: "billing_recovered",
        title: "[결제 확인]",
        body: `「${teamName}」 결제가 확인되어 제한이 해제되었습니다.`,
        link,
      });
    }
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  evCtx: StripeEventDispatchContext
): Promise<void> {
  const fallbackTeamId =
    typeof session.client_reference_id === "string" &&
    !String(session.client_reference_id).startsWith("org:")
      ? String(session.client_reference_id)
      : "";
  const teamId = String(session.metadata?.teamId || fallbackTeamId || "").trim();
  const orgId = String(session.metadata?.orgId || "").trim();

  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription && typeof session.subscription === "object"
        ? (session.subscription as Stripe.Subscription).id
        : null;
  if (!subId) {
    logger.warn("[stripeBillingWebhook] checkout without subscription id", {
      sessionId: session.id,
      teamId: teamId || null,
      orgId: orgId || null,
    });
    return;
  }
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
  const ur = await upsertSubscriptionMirror(sub, {
    orgId: orgId || null,
    teamId: teamId || null,
    sourceEvent: "checkout.session.completed",
    stripeEvent: evCtx,
  });
  if (ur === "skipped_stale") {
    return;
  }
  if (orgId && !teamId) {
    return;
  }
  if (!teamId) {
    logger.warn("[stripeBillingWebhook] checkout.session.completed without resolvable teamId/orgId", {
      sessionId: session.id,
      clientReferenceId:
        typeof session.client_reference_id === "string" ? session.client_reference_id : null,
    });
    return;
  }
  await applySubscriptionToTeam(teamId, sub);
}

async function handleSubscriptionWrite(
  sub: Stripe.Subscription,
  evCtx: StripeEventDispatchContext,
  sourceEvent: string = "customer.subscription.*"
): Promise<void> {
  let orgId: string | null = String(sub.metadata?.orgId || "").trim() || null;
  let teamId: string | null = String(sub.metadata?.teamId || "").trim() || null;

  if (!orgId && !teamId) {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (!customerId) {
      const r0 = await upsertSubscriptionMirror(sub, { sourceEvent, stripeEvent: evCtx });
      if (r0 === "skipped_stale") {
        return;
      }
      return;
    }
    const tq = await db.collection("teams").where("stripeCustomerId", "==", customerId).limit(5).get();
    if (!tq.empty) {
      if (tq.docs.length > 1) {
        logger.error("[stripeBillingWebhook] multiple teams for same stripeCustomerId", { customerId });
      }
      teamId = tq.docs[0]!.id;
    } else {
      const oq = await db
        .collection("orgs")
        .where("billing.stripeCustomerId", "==", customerId)
        .limit(2)
        .get();
      if (!oq.empty) {
        if (oq.docs.length > 1) {
          logger.error("[stripeBillingWebhook] multiple orgs for same billing.stripeCustomerId", { customerId });
        }
        orgId = oq.docs[0]!.id;
      } else {
        logger.warn(
          "[stripeBillingWebhook] subscription without teamId/orgId in metadata and no org/team by customer",
          {
            subscriptionId: sub.id,
            customerId,
          }
        );
        const r0 = await upsertSubscriptionMirror(sub, { sourceEvent, stripeEvent: evCtx });
        if (r0 === "skipped_stale") {
          return;
        }
        return;
      }
    }
  }

  const r = await upsertSubscriptionMirror(sub, { orgId, teamId, sourceEvent, stripeEvent: evCtx });
  if (r === "skipped_stale") {
    return;
  }

  if (teamId) {
    await applySubscriptionToTeam(teamId, sub);
  }
}

async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  const evCtx: StripeEventDispatchContext = {
    eventCreated: event.created,
    eventId: String(event.id),
  };
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        await handleCheckoutSessionCompleted(session, evCtx);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionWrite(sub, evCtx, "customer.subscription.*");
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription && typeof invoice.subscription === "object"
            ? (invoice.subscription as Stripe.Subscription).id
            : null;
      if (!subId) break;
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
      const orgId = String(sub.metadata?.orgId || "").trim() || null;
      const teamId = String(sub.metadata?.teamId || "").trim() || null;
      await recordPaymentMirror(invoice, {
        orgId,
        teamId,
        sourceEvent: "invoice.payment_succeeded",
      });
      await handleSubscriptionWrite(sub, evCtx, "invoice.payment_succeeded");
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await sendSlackAlert(
        [
          "⚠️ Stripe invoice.payment_failed",
          `eventId: ${event.id}`,
          `invoiceId: ${String(invoice.id || "unknown")}`,
          `subscriptionId: ${
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription && typeof invoice.subscription === "object"
                ? (invoice.subscription as Stripe.Subscription).id
                : "unknown"
          }`,
          `customerId: ${
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer && typeof invoice.customer === "object"
                ? (invoice.customer as Stripe.Customer).id
                : "unknown"
          }`,
        ].join("\n")
      );
      const subId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription && typeof invoice.subscription === "object"
            ? (invoice.subscription as Stripe.Subscription).id
            : null;
      if (!subId) break;
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
      await handleSubscriptionWrite(sub, evCtx, "customer.subscription.*");
      break;
    }
    default:
      break;
  }
}

export const stripeBillingWebhook = onRequest(
  {
    region: "asia-northeast3",
    cors: false,
    invoker: "public",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [STRIPE_SECRET_KEY_V2, STRIPE_WEBHOOK_SECRET, SLACK_WEBHOOK_URL],
  },
  async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || Array.isArray(sig)) {
    res.status(400).send("Missing stripe-signature");
    return;
  }
  const whSecret = String(STRIPE_WEBHOOK_SECRET.value() || "").trim();
  if (!whSecret) {
    logger.error("[stripeBillingWebhook] STRIPE_WEBHOOK_SECRET missing");
    res.status(500).send("Webhook secret not configured");
    return;
  }

  let event: Stripe.Event;
  try {
    if (!Buffer.isBuffer(req.rawBody)) {
      logger.error("[stripeBillingWebhook] raw body unavailable for signature verification", {
        bodyType: typeof req.body,
        contentType: req.headers["content-type"] || null,
      });
      res.status(400).send("Webhook Error: raw body is required");
      return;
    }
    event = getStripe().webhooks.constructEvent(req.rawBody, sig, whSecret);
  } catch (err) {
    logger.warn("[stripeBillingWebhook] signature verification failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const eventId = String(event.id || "").trim();
  if (!eventId) {
    res.status(400).send("Event without id");
    return;
  }
  const eventRef = db.doc(`${STRIPE_EVENT_LEASE}/${eventId}`);

  const claim = await claimStripeWebhookEvent(event);
  if (claim === "duplicate_completed" || claim === "duplicate_inflight") {
    logger.info("[stripeBillingWebhook] idempotent — skip processing", { eventId, type: event.type, claim });
    res.status(200).json({ received: true, duplicate: true, reason: claim });
    return;
  }

  try {
    await dispatchStripeEvent(event);
    await eventRef.set(
      {
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        ttlExpireAt: ttlTimestampDaysFromNow(STRIPE_EVENT_TTL_DAYS),
      },
      { merge: true }
    );
  } catch (e) {
    if (isStripeConnectionError(e)) {
      logger.warn("[stripeBillingWebhook] transient stripe connection error, deferred", {
        eventId,
        type: event.type,
        message: e instanceof Error ? e.message : String(e),
      });
      await eventRef.set(
        {
          status: "deferred",
          deferredAt: FieldValue.serverTimestamp(),
          deferredReason: "stripe_connection_error",
          deferredMessage: e instanceof Error ? e.message : String(e),
          ttlExpireAt: ttlTimestampDaysFromNow(STRIPE_EVENT_TTL_DAYS),
        },
        { merge: true }
      );
      res.sendStatus(200);
      return;
    }
    logger.error("[stripeBillingWebhook] handler failed", {
      eventId,
      type: event.type,
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    await sendSlackAlert(
      [
        "🚨 Stripe Webhook handler failed",
        `eventId: ${eventId}`,
        `eventType: ${event.type}`,
        `message: ${e instanceof Error ? e.message : String(e)}`,
      ].join("\n")
    );
    await eventRef.set(
      {
        status: "failed",
        failedAt: FieldValue.serverTimestamp(),
        errorMessage: e instanceof Error ? e.message : String(e),
        ttlExpireAt: ttlTimestampDaysFromNow(STRIPE_EVENT_TTL_DAYS),
      },
      { merge: true }
    );
    res.status(500).send("Handler error — Stripe will retry");
    return;
  }

  res.sendStatus(200);
}
);
