// functions/src/createBillingPortalSession.ts
// 🔥 Stripe Customer Portal 세션 생성 (구독 관리/해지)

import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import Stripe from "stripe";
import { requireAdmin } from "./utils/requireAdmin";

// Initialize Firebase Admin only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

const APP_BASE_URL = process.env.APP_BASE_URL || "https://localhost:5173";

/**
 * Stripe Customer Portal 세션 생성 (Callable)
 */
export const createBillingPortalSession = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const db = getFirestore();
    const uid = request.auth?.uid;
    const { teamId } = request.data as { teamId: string };

    if (!uid) {
      throw new Error("인증이 필요합니다.");
    }

    if (!teamId) {
      throw new Error("teamId가 필요합니다.");
    }

    // 🔐 관리자 권한 체크
    try {
      await requireAdmin(teamId, uid);
      logger.info(`💳 [createBillingPortalSession] 팀 ${teamId} 구독 관리 시작 (권한 확인 완료)`);
    } catch (authError: any) {
      logger.warn(`⚠️ [createBillingPortalSession] 권한 체크 실패:`, authError);
      throw new Error("팀 관리자만 구독을 관리할 수 있습니다.");
    }

    try {
      // 구독 정보 조회
      const subRef = db.doc(`teams/${teamId}/subscription/current`);
      const subSnap = await subRef.get();

      if (!subSnap.exists) {
        throw new Error("구독 정보가 없습니다.");
      }

      const subData = subSnap.data();
      const stripeCustomerId = subData?.stripeCustomerId;

      if (!stripeCustomerId) {
        throw new Error("Stripe 고객 정보가 없습니다.");
      }

      // Customer Portal 세션 생성
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${APP_BASE_URL}/sports/${teamId}/team`, // 적절한 경로로 수정 필요
      });

      logger.info(`✅ [createBillingPortalSession] team=${teamId} portal=${portalSession.id}`);

      return { url: portalSession.url };
    } catch (error: any) {
      logger.error(`❌ [createBillingPortalSession] Portal 세션 생성 실패:`, error);
      throw new Error(`구독 관리 페이지 열기 실패: ${error.message}`);
    }
  }
);

