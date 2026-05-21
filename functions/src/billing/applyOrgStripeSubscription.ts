import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import * as logger from "firebase-functions/logger";
import {
  mapStripeSubscriptionStatus,
  resolvePlanFromStripePriceId,
  subscriptionEndedOnStripe,
} from "../lib/teamPlan";
import { fetchSubscriptionWithPriceDetails } from "../lib/stripeMrr";
import { teamPlanToOrgPlanId } from "./orgStripePlan";

const db = admin.firestore();

/**
 * Stripe 구독 상태 → `orgs/{orgId}` 의 planId·billing.* 반영
 */
export async function applySubscriptionToOrg(
  stripe: Stripe,
  orgId: string,
  sub: Stripe.Subscription
): Promise<void> {
  const orgRef = db.doc(`orgs/${orgId}`);
  const orgSnap = await orgRef.get();
  const before = orgSnap.exists ? (orgSnap.data() as Record<string, unknown>) : {};
  const billingBefore = (before.billing as Record<string, unknown> | undefined) || {};

  const subFull = await fetchSubscriptionWithPriceDetails(stripe, sub.id, sub);

  if (subscriptionEndedOnStripe(subFull.status)) {
    const { stripeSubscriptionId: _rm, ...billingRest } = billingBefore;
    void _rm;
    await orgRef.set(
      {
        planId: "free",
        billing: {
          ...billingRest,
          status: "canceled",
          plan: "free",
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    logger.info("[applyOrgStripeSubscription] subscription ended", { orgId });
    return;
  }

  const rawPrice = subFull.items.data[0]?.price;
  const priceIdStr = typeof rawPrice === "string" ? rawPrice : rawPrice?.id;
  const teamPlan = priceIdStr ? resolvePlanFromStripePriceId(priceIdStr) : null;
  const orgPlanId = teamPlan ? teamPlanToOrgPlanId(teamPlan) : "free";

  const nextBilling = mapStripeSubscriptionStatus(subFull.status);

  await orgRef.set(
    {
      planId: orgPlanId,
      billing: {
        ...billingBefore,
        status: nextBilling,
        plan: orgPlanId,
        stripeSubscriptionId: subFull.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  logger.info("[applyOrgStripeSubscription] updated", { orgId, orgPlanId, nextBilling });
}
