/**
 * 운영 CS: 결제는 됐는데 `orgId`가 없어 `orphan_subscriptions`에만 남은 구독을
 * 지정 조직에 붙이고 Stripe metadata·`subscriptions`·`orgs`를 정합시킨다.
 */
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import Stripe from "stripe";
import { assertPlatformAdmin } from "../lib/assertPlatformAdmin";
import { applySubscriptionToOrg } from "./applyOrgStripeSubscription";
import { upsertSubscriptionMirror } from "./stripeBillingWebhook";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const STRIPE_SECRET_KEY_V2 = defineSecret("STRIPE_SECRET_KEY_V2");
const REGION = "asia-northeast3";
const ORPHAN_SUBS = "orphan_subscriptions";

function getStripe(): Stripe {
  const key = String(STRIPE_SECRET_KEY_V2.value() || "").trim();
  if (!key) {
    throw new HttpsError("failed-precondition", "STRIPE_SECRET_KEY_V2가 설정되지 않았습니다.");
  }
  return new Stripe(key, { typescript: true });
}

type Body = { subscriptionId?: string; orgId?: string; teamId?: string };

/**
 * 플랫폼 관리자 전용: orphan 구독을 `orgId`에 연결
 */
export const attachOrphanSubscriptionToOrg = onCall(
  {
    region: REGION,
    cors: true,
    timeoutSeconds: 60,
    secrets: [STRIPE_SECRET_KEY_V2],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const uid = request.auth.uid;
    await assertPlatformAdmin(uid, request.auth.token as Record<string, unknown>);

    const data = (request.data || {}) as Body;
    const subscriptionId = String(data.subscriptionId || "").trim();
    const orgId = String(data.orgId || "").trim();
    const teamIdArg = data.teamId != null ? String(data.teamId).trim() : "";

    if (!subscriptionId.startsWith("sub_") || subscriptionId.length < 8) {
      throw new HttpsError("invalid-argument", "유효한 Stripe subscriptionId(sub_...)가 필요합니다.");
    }
    if (!orgId) {
      throw new HttpsError("invalid-argument", "orgId가 필요합니다.");
    }

    const orgRef = db.doc(`orgs/${orgId}`);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      throw new HttpsError("not-found", "해당 orgId의 조직이 없습니다.");
    }

    const stripe = getStripe();
    const sub0 = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });

    const meta = { ...(sub0.metadata as Record<string, string> | null | undefined) };
    meta.orgId = orgId;
    if (teamIdArg) {
      meta.teamId = teamIdArg;
    }

    await stripe.subscriptions.update(subscriptionId, { metadata: meta });
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
    const teamId = (String(sub.metadata?.teamId || "").trim() || null) as string | null;

    await applySubscriptionToOrg(stripe, orgId, sub);
    await upsertSubscriptionMirror(sub, {
      orgId,
      teamId: teamId ?? null,
      sourceEvent: "admin_attach_orphan",
    });

    const orphanRef = db.doc(`${ORPHAN_SUBS}/${subscriptionId}`);
    const orphSnap = await orphanRef.get();
    if (orphSnap.exists) {
      await orphanRef.delete();
    }

    await db.doc(`subscriptions/${subscriptionId}`).set(
      {
        attachedByUid: uid,
        attachedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("attachOrphanSubscriptionToOrg: success", { subscriptionId, orgId, hadOrphan: orphSnap.exists });
    return { ok: true, subscriptionId, orgId, teamId };
  }
);
