/**
 * Org 단위 Stripe Checkout (구독) — 플랫폼 관리자 전용 (Org & Billing Center).
 *
 * 키: `STRIPE_SECRET_KEY_V2`(Secret) — 팀 Checkout·웹훅과 동일. 로컬은 `STRIPE_SECRET_KEY` 폴백.
 * Price id: 클라이언트 `priceId` 우선, 없으면 `STRIPE_PRICE_PRO`.
 */
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { assertPlatformAdmin } from "../lib/assertPlatformAdmin";
import { resolvePlanFromStripePriceId } from "../lib/teamPlan";

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
    throw new HttpsError(
      "failed-precondition",
      "STRIPE_SECRET_KEY_V2(또는 STRIPE_SECRET_KEY)가 Functions에 없습니다. Secret/환경을 설정한 뒤 배포하세요."
    );
  }
  return new Stripe(key, { typescript: true });
}

export const createOrgStripeCheckoutSession = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 60, secrets: [STRIPE_SECRET_KEY_V2] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const uid = request.auth.uid;
    await assertPlatformAdmin(uid, request.auth.token as Record<string, unknown>);

    const orgId = String(request.data?.orgId || "").trim();
    const priceId = String(
      request.data?.priceId || process.env.STRIPE_PRICE_PRO || ""
    ).trim();
    if (!orgId || !priceId) {
      throw new HttpsError(
        "invalid-argument",
        "orgId가 필요합니다. priceId는 요청에 넣거나 Functions 환경변수 STRIPE_PRICE_PRO 를 설정해 주세요."
      );
    }
    if (!resolvePlanFromStripePriceId(priceId)) {
      throw new HttpsError(
        "invalid-argument",
        "지원하지 않는 Stripe price id 입니다. STRIPE_PRICE_* 환경변수를 확인해 주세요."
      );
    }

    const orgRef = db.doc(`orgs/${orgId}`);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      throw new HttpsError("not-found", "조직을 찾을 수 없습니다.");
    }
    const org = orgSnap.data() as Record<string, unknown>;
    const billing = (org.billing as Record<string, unknown> | undefined) || {};

    const stripe = getStripe();
    let customerId = typeof billing.stripeCustomerId === "string" ? String(billing.stripeCustomerId).trim() : "";
    if (!customerId) {
      const email =
        typeof request.auth.token.email === "string" && request.auth.token.email
          ? request.auth.token.email
          : undefined;
      const customer = await stripe.customers.create({
        metadata: { orgId, firebaseUid: uid },
        email,
      });
      customerId = customer.id;
      await orgRef.set(
        {
          billing: {
            ...billing,
            stripeCustomerId: customerId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const appUrl = (process.env.APP_URL || "").trim().replace(/\/$/, "");
    if (!appUrl) {
      throw new HttpsError("failed-precondition", "APP_URL이 설정되지 않았습니다.");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/admin/org-billing?stripe=success&orgId=${encodeURIComponent(orgId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app/admin/org-billing?stripe=cancel&orgId=${encodeURIComponent(orgId)}`,
      metadata: { orgId, firebaseUid: uid, userId: uid },
      subscription_data: {
        metadata: { orgId, firebaseUid: uid, userId: uid },
      },
      client_reference_id: `org:${orgId}`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new HttpsError("internal", "Checkout URL을 받지 못했습니다.");
    }

    return { url: session.url };
  }
);
