import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const STRIPE_SECRET_KEY_V2 = defineSecret("STRIPE_SECRET_KEY_V2");

type CancelSubscriptionAction = "cancel" | "resume";

function getStripe(): Stripe {
  const key = String(
    STRIPE_SECRET_KEY_V2.value() || (process.env.STRIPE_SECRET_KEY || "").trim() || ""
  ).trim();
  if (!key) {
    throw new HttpsError("failed-precondition", "결제(Stripe) 키가 설정되지 않았습니다.");
  }
  return new Stripe(key, { typescript: true });
}

export const cancelSubscriptionForTeam = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 60, secrets: [STRIPE_SECRET_KEY_V2] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const uid = request.auth.uid;
    const teamId = String(request.data?.teamId || "").trim();
    const actionRaw = String(request.data?.action || "cancel").trim().toLowerCase();
    const action: CancelSubscriptionAction = actionRaw === "resume" ? "resume" : "cancel";

    if (!teamId) {
      throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
    }
    if (teamId.includes("/") || teamId.includes("\\")) {
      throw new HttpsError("invalid-argument", "유효하지 않은 teamId입니다.");
    }

    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }
    const team = teamSnap.data() as Record<string, unknown>;
    const ownerUid = String(team.ownerUid || "").trim();
    if (!ownerUid || ownerUid !== uid) {
      throw new HttpsError("permission-denied", "팀 대표만 구독 상태를 변경할 수 있습니다.");
    }

    const subscriptionId = String(team.stripeSubscriptionId || "").trim();
    if (!subscriptionId) {
      throw new HttpsError("failed-precondition", "활성 Stripe 구독 정보가 없습니다.");
    }

    const stripe = getStripe();
    const cancelAtPeriodEnd = action === "cancel";

    let updated: Stripe.Subscription;
    try {
      updated = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new HttpsError("failed-precondition", `Stripe 구독 상태 변경 실패: ${msg}`);
    }

    await teamRef.set(
      {
        cancelAtPeriodEnd: updated.cancel_at_period_end === true,
      },
      { merge: true }
    );

    return {
      ok: true as const,
      teamId,
      subscriptionId,
      cancelAtPeriodEnd: updated.cancel_at_period_end === true,
      currentPeriodEnd:
        typeof updated.current_period_end === "number" ? updated.current_period_end : null,
      action,
    };
  }
);

