import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { isPlanAtLeast, resolvePlanFromStripePriceId, type TeamPlanId } from "../lib/teamPlan";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const STRIPE_SECRET_KEY_V2 = defineSecret("STRIPE_SECRET_KEY_V2");

function getStripe(): Stripe {
  const key = String(
    STRIPE_SECRET_KEY_V2.value() || (process.env.STRIPE_SECRET_KEY || "").trim() || ""
  ).trim();
  if (!key) {
    throw new HttpsError("failed-precondition", "결제(Stripe) 키가 설정되지 않았습니다.");
  }
  return new Stripe(key, { typescript: true });
}

function resolvePriceIdByPlan(plan: TeamPlanId): string {
  if (plan === "basic") return String(process.env.STRIPE_PRICE_BASIC || "").trim();
  if (plan === "pro") return String(process.env.STRIPE_PRICE_PRO || "").trim();
  if (plan === "team_plus") return String(process.env.STRIPE_PRICE_TEAM_PLUS || "").trim();
  return "";
}

export const updateSubscriptionForTeam = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 60, secrets: [STRIPE_SECRET_KEY_V2] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const uid = request.auth.uid;
    const teamId = String(request.data?.teamId || "").trim();
    const requestedPriceId = String(request.data?.priceId || "").trim();
    const requestedPlan = String(request.data?.plan || "")
      .trim()
      .toLowerCase() as TeamPlanId | "";

    if (!teamId) {
      throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
    }

    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }
    const team = teamSnap.data() as Record<string, unknown>;

    const ownerUid = String(team.ownerUid || "").trim();
    if (!ownerUid || ownerUid !== uid) {
      throw new HttpsError("permission-denied", "팀 대표만 플랜을 변경할 수 있습니다.");
    }
    const billingStatus = String(team.billingStatus || "active").trim().toLowerCase();
    if (billingStatus === "past_due") {
      throw new HttpsError(
        "failed-precondition",
        "결제 실패 상태(past_due)에서는 플랜 변경이 불가능합니다. 결제 상태를 먼저 복구해 주세요."
      );
    }

    const subscriptionId = String(team.stripeSubscriptionId || "").trim();
    if (!subscriptionId) {
      throw new HttpsError("failed-precondition", "활성 Stripe 구독 정보가 없습니다.");
    }

    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    const firstItem = sub.items.data[0];
    if (!firstItem?.id) {
      throw new HttpsError("failed-precondition", "구독 아이템을 찾을 수 없습니다.");
    }
    const currentPriceId =
      typeof firstItem.price === "string" ? firstItem.price : String(firstItem.price?.id || "").trim();
    const currentPlan = resolvePlanFromStripePriceId(currentPriceId);
    if (!currentPlan) {
      throw new HttpsError(
        "failed-precondition",
        "현재 구독의 priceId를 플랜으로 해석할 수 없습니다. STRIPE_PRICE_* 환경변수를 확인해 주세요."
      );
    }

    // free 다운그레이드는 구독 가격 변경이 아니라 기간말 해지 예약으로 처리
    if (requestedPlan === "free") {
      const canceled = await stripe.subscriptions.update(
        subscriptionId,
        { cancel_at_period_end: true },
        { idempotencyKey: `cancel-at-end:${teamId}:${subscriptionId}` }
      );
      await teamRef.set({ cancelAtPeriodEnd: canceled.cancel_at_period_end === true }, { merge: true });
      return {
        ok: true as const,
        mode: "cancel_at_period_end" as const,
        cancelAtPeriodEnd: canceled.cancel_at_period_end === true,
      };
    }

    const targetPriceId = requestedPriceId || (requestedPlan ? resolvePriceIdByPlan(requestedPlan) : "");
    if (!targetPriceId) {
      throw new HttpsError("invalid-argument", "priceId 또는 plan(basic|pro|team_plus|free)이 필요합니다.");
    }
    const targetPlan = resolvePlanFromStripePriceId(targetPriceId);
    if (!targetPlan) {
      throw new HttpsError("invalid-argument", "지원하지 않는 Stripe priceId입니다.");
    }
    if (targetPlan === "free") {
      throw new HttpsError("invalid-argument", "free 전환은 plan='free' 요청으로만 가능합니다.");
    }
    if (currentPriceId === targetPriceId && sub.cancel_at_period_end !== true) {
      return {
        ok: true as const,
        mode: "noop" as const,
        currentPriceId,
        targetPriceId,
      };
    }

    const isUpgrade = isPlanAtLeast(targetPlan, currentPlan) && targetPlan !== currentPlan;
    const prorationBehavior: Stripe.SubscriptionUpdateParams.ProrationBehavior = isUpgrade
      ? "create_prorations"
      : "none";

    const updated = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: false,
        proration_behavior: prorationBehavior,
        items: [{ id: firstItem.id, price: targetPriceId }],
      },
      {
        idempotencyKey: `update-sub:${teamId}:${subscriptionId}:${targetPriceId}:${prorationBehavior}`,
      }
    );

    await teamRef.set(
      {
        cancelAtPeriodEnd: updated.cancel_at_period_end === true,
      },
      { merge: true }
    );

    return {
      ok: true as const,
      mode: "price_update" as const,
      currentPriceId,
      targetPriceId,
      currentPlan,
      targetPlan,
      prorationBehavior,
      cancelAtPeriodEnd: updated.cancel_at_period_end === true,
    };
  }
);

