/**
 * 🔥 결제 처리 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 결제 요청 처리
 * - PG 연동 (Toss Payments, KCP 등)
 * - 에스크로 보관
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { createTrade, confirmPayment } from "./escrow";
import { db } from "../firebase";

/**
 * 결제 요청 처리
 * 
 * 실제 프로덕션에서는 Toss Payments, KCP 등 PG 연동 필요
 */
export const requestPayment = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const { postId, sellerId, amount } = request.data;
    const buyerId = request.auth?.uid;

    if (!buyerId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!postId || !sellerId || !amount) {
      throw new HttpsError(
        "invalid-argument",
        "postId, sellerId, amount가 필요합니다."
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new HttpsError("invalid-argument", "올바른 금액을 입력해주세요.");
    }

    try {
      // 🔥 거래 생성
      const tradeId = await createTrade(postId, sellerId, buyerId, amount);

      // 🔥 TODO: 실제 PG 결제 요청
      // 예시: Toss Payments
      // const paymentResponse = await tossPayments.requestPayment({
      //   amount,
      //   orderId: tradeId,
      //   orderName: `거래 #${tradeId}`,
      //   customerName: buyerId,
      // });

      // 🔥 임시: 더미 결제 ID (실제 구현 필요)
      const paymentId = `payment_${tradeId}_${Date.now()}`;

      // 🔥 결제 완료 처리 (에스크로 보관)
      await confirmPayment(tradeId, paymentId);

      logger.info("[requestPayment] 결제 요청 완료:", {
        tradeId,
        postId,
        sellerId,
        buyerId,
        amount,
        paymentId,
      });

      return {
        success: true,
        tradeId,
        paymentId,
        amount,
        deposit: Math.round(amount * 0.1), // 보증금 10%
      };
    } catch (error: any) {
      logger.error("[requestPayment] 결제 요청 실패:", {
        postId,
        sellerId,
        buyerId,
        amount,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "결제 요청 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);

/**
 * 결제 확인 (PG 콜백 처리)
 * 
 * 실제 프로덕션에서는 PG에서 호출하는 웹훅 엔드포인트
 */
export const confirmPaymentWebhook = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const { tradeId, paymentId, status } = request.data;

    if (!tradeId || !paymentId || !status) {
      throw new HttpsError(
        "invalid-argument",
        "tradeId, paymentId, status가 필요합니다."
      );
    }

    try {
      if (status === "DONE") {
        // 🔥 결제 완료 처리
        await confirmPayment(tradeId, paymentId);

        logger.info("[confirmPaymentWebhook] 결제 확인 완료:", {
          tradeId,
          paymentId,
        });

        return { success: true, tradeId, paymentId };
      } else {
        // 🔥 결제 실패
        logger.warn("[confirmPaymentWebhook] 결제 실패:", {
          tradeId,
          paymentId,
          status,
        });

        return { success: false, tradeId, status };
      }
    } catch (error: any) {
      logger.error("[confirmPaymentWebhook] 결제 확인 실패:", {
        tradeId,
        paymentId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "결제 확인 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
