// functions/src/createCheckoutSession.ts
// 🔥 팀 블로그 Pro 결제 Checkout 세션 생성

import { onCall } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import Stripe from "stripe";
import { requireAdmin } from "./utils/requireAdmin";

// Initialize Firebase Admin only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Stripe 초기화
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

const APP_BASE_URL = process.env.APP_BASE_URL || "https://localhost:5173";
const PRICE_MONTH = process.env.STRIPE_PRICE_TEAM_PRO_MONTH as string;
const PRICE_YEAR = process.env.STRIPE_PRICE_TEAM_PRO_YEAR as string;

interface CreateCheckoutPayload {
  teamId: string;
  interval?: "month" | "year";
}

/**
 * Stripe Checkout 세션 생성 (Callable)
 */
export const createCheckoutSession = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const db = getFirestore();
    const uid = request.auth?.uid;
    const { teamId, interval = "month" } = request.data as CreateCheckoutPayload;

    if (!uid) {
      throw new Error("인증이 필요합니다.");
    }

    if (!teamId) {
      throw new Error("teamId가 필요합니다.");
    }

    // 🔐 관리자 권한 체크
    try {
      await requireAdmin(teamId, uid);
      logger.info(`💳 [createCheckoutSession] 팀 ${teamId} 결제 시작 (권한 확인 완료)`);
    } catch (authError: any) {
      logger.warn(`⚠️ [createCheckoutSession] 권한 체크 실패:`, authError);
      throw new Error("팀 관리자만 결제할 수 있습니다.");
    }

    try {
      // 1️⃣ 팀 정보 조회
      const teamRef = db.doc(`teams/${teamId}`);
      const teamSnap = await teamRef.get();
      if (!teamSnap.exists) {
        throw new Error("팀을 찾을 수 없습니다.");
      }
      const teamData = teamSnap.data() || {};

      // 2️⃣ 기존 구독 확인
      const subRef = teamRef.collection("subscription").doc("current");
      const subSnap = await subRef.get();
      let stripeCustomerId = subSnap.exists ? subSnap.data()?.stripeCustomerId : undefined;

      // 3️⃣ Stripe Customer 생성/재사용
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: request.auth.token.email,
          metadata: {
            teamId,
            teamName: teamData.name || "",
          },
        });
        stripeCustomerId = customer.id;

        await subRef.set(
          {
            stripeCustomerId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // 4️⃣ Price ID 선택
      const priceId = interval === "year" ? PRICE_YEAR : PRICE_MONTH;
      if (!priceId) {
        throw new Error("결제 가격 설정이 없습니다. 관리자에게 문의하세요.");
      }

      // 5️⃣ Checkout 세션 생성
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${APP_BASE_URL}/billing/success?teamId=${teamId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_BASE_URL}/billing/cancel?teamId=${teamId}`,
        metadata: {
          teamId,
          interval,
          adminUid: uid, // AuditLog용
        },
        subscription_data: {
          metadata: {
            teamId,
            adminUid: uid, // AuditLog용
          },
        },
        allow_promotion_codes: true, // 프로모션 코드 허용
      });

      logger.info(`✅ [createCheckoutSession] team=${teamId} session=${session.id}`);

      return { url: session.url };
    } catch (error: any) {
      logger.error(`❌ [createCheckoutSession] 결제 세션 생성 실패:`, error);
      throw new Error(`결제 세션 생성 실패: ${error.message}`);
    }
  }
);

