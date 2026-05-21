/**
 * Stripe Checkout 세션 서버 검증 — success_url의 session_id 조작·타인 세션 열람 방지.
 * 팀 대표(metadata.firebaseUid) 또는 레거시 세션(metadata 없음) 시 teams.ownerUid 일치만 허용.
 */
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

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

function subscriptionIdFromSession(session: Stripe.Checkout.Session): string | null {
  const sub = session.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) {
    return (sub as Stripe.Subscription).id;
  }
  return null;
}

export const verifyCheckoutSession = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 30, secrets: [STRIPE_SECRET_KEY_V2] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const uid = request.auth.uid;
    const sessionId = String(request.data?.session_id || request.data?.sessionId || "").trim();
    const teamIdArg = String(request.data?.teamId || "").trim();

    if (!sessionId.startsWith("cs_") || sessionId.length < 20 || sessionId.length > 128) {
      throw new HttpsError("invalid-argument", "유효하지 않은 session_id입니다.");
    }

    const stripe = getStripe();
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (e: unknown) {
      console.error("[verifyCheckoutSession] Stripe retrieve failed", e);
      throw new HttpsError("not-found", "세션을 찾을 수 없거나 만료되었습니다.");
    }

    if (session.mode !== "subscription") {
      throw new HttpsError("failed-precondition", "구독 Checkout 세션이 아닙니다.");
    }

    if (session.status !== "complete") {
      throw new HttpsError("failed-precondition", "결제가 아직 완료되지 않은 세션입니다.");
    }

    const paidOk =
      session.payment_status === "paid" || session.payment_status === "no_payment_required";
    if (!paidOk) {
      throw new HttpsError("failed-precondition", "결제 상태가 완료로 확인되지 않았습니다.");
    }

    const meta = session.metadata || {};
    const sessionTeamId =
      (typeof meta.teamId === "string" && meta.teamId.trim()) ||
      (typeof session.client_reference_id === "string" && session.client_reference_id.trim()) ||
      "";

    if (!sessionTeamId) {
      throw new HttpsError("failed-precondition", "세션에 팀 정보가 없습니다.");
    }

    if (teamIdArg && teamIdArg !== sessionTeamId) {
      throw new HttpsError("permission-denied", "요청한 팀과 결제 세션의 팀이 일치하지 않습니다.");
    }

    const metaUid = typeof meta.firebaseUid === "string" ? meta.firebaseUid.trim() : "";
    if (metaUid) {
      if (metaUid !== uid) {
        throw new HttpsError("permission-denied", "이 결제 세션을 확인할 권한이 없습니다.");
      }
    } else {
      const teamSnap = await db.doc(`teams/${sessionTeamId}`).get();
      if (!teamSnap.exists) {
        throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
      }
      const owner = String((teamSnap.data() as Record<string, unknown>)?.ownerUid || "").trim();
      if (!owner || owner !== uid) {
        throw new HttpsError("permission-denied", "팀 대표만 이 세션을 확인할 수 있습니다.");
      }
    }

    return {
      verified: true as const,
      teamId: sessionTeamId,
      paymentStatus: session.payment_status,
      subscriptionId: subscriptionIdFromSession(session),
    };
  }
);
