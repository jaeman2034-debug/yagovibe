/**
 * 🔥 결제 요청 생성 (Callable Function)
 * 
 * 승인된 참가 신청에 대한 결제 요청 생성
 * 토스페이먼츠 결제 URL 반환
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

/**
 * 결제 요청 생성 (Callable Function)
 * 
 * @param request.data
 *   - associationId: string
 *   - tournamentId: string
 *   - applicationId: string
 */
export const createPaymentRequest = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 30,
  },
  async (request) => {
    // 인증 확인
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { associationId, tournamentId, applicationId } = request.data || {};

    if (!associationId || !tournamentId || !applicationId) {
      throw new HttpsError(
        "invalid-argument",
        "associationId, tournamentId, applicationId가 필요합니다."
      );
    }

    const uid = request.auth.uid;

    try {
      // 1. Application 조회 및 권한 확인
      const appRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
      );
      const appDoc = await appRef.get();

      if (!appDoc.exists) {
        throw new HttpsError("not-found", "참가 신청을 찾을 수 없습니다.");
      }

      const appData = appDoc.data()!;

      // 팀장 확인
      const teamManagerId = appData.teamManagerId || appData.captainUid;
      if (teamManagerId !== uid) {
        throw new HttpsError(
          "permission-denied",
          "팀장만 결제할 수 있습니다."
        );
      }

      // 승인 상태 확인
      if (appData.status !== "approved" && appData.status !== "APPROVED") {
        throw new HttpsError(
          "failed-precondition",
          "승인된 신청만 결제할 수 있습니다."
        );
      }

      // 이미 결제 완료 확인
      if (appData.paymentStatus === "PAID") {
        throw new HttpsError(
          "already-exists",
          "이미 결제가 완료되었습니다."
        );
      }

      // 2. 🔥 v2: 결제 금액은 서버에서 재계산 (단일 소스 보장)
      const feePolicy = appData.feePolicySnapshot || {
        baseFee: 200000,
        baseTeamCount: 2,
        extraFeePerTeam: 100000,
      };
      
      const teamCount = appData.teamCount || 1;
      const extraTeams = Math.max(teamCount - feePolicy.baseTeamCount, 0);
      const extraFee = extraTeams * feePolicy.extraFeePerTeam;
      const totalAmount = feePolicy.baseFee + extraFee;

      if (totalAmount <= 0) {
        throw new HttpsError(
          "failed-precondition",
          "결제할 금액이 없습니다."
        );
      }

      // 3. 🔥 v2: payments/{applicationId} 구조로 조회 (1:1 관계)
      const paymentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/payments/${applicationId}`
      );
      const paymentDoc = await paymentRef.get();

      if (!paymentDoc.exists) {
        throw new HttpsError(
          "failed-precondition",
          "결제 정보가 없습니다. 승인 후 자동 생성됩니다."
        );
      }

      const paymentData = paymentDoc.data()!;

      // 결제 상태 확인
      if (paymentData.status === "paid" || paymentData.status === "PAID") {
        throw new HttpsError(
          "already-exists",
          "이미 결제가 완료되었습니다."
        );
      }

      if (paymentData.status !== "ready") {
        throw new HttpsError(
          "failed-precondition",
          "결제 준비가 완료되지 않았습니다."
        );
      }

      // 4. 🔥 토스페이먼츠 결제 요청 생성
      // TODO: 실제 토스페이먼츠 SDK 연동
      // const tossPayments = require("@tosspayments/payment-sdk");
      // const tossPayment = await tossPayments.createPayment({
      //   amount: totalAmount,
      //   orderId: paymentData.orderId,
      //   orderName: `${appData.teamName} 참가비`,
      //   customerName: appData.managerName || appData.teamName,
      //   successUrl: `${process.env.FRONTEND_URL || "https://yago.app"}/payment/success?orderId=${paymentData.orderId}`,
      //   failUrl: `${process.env.FRONTEND_URL || "https://yago.app"}/payment/fail?orderId=${paymentData.orderId}`,
      // });

      // 임시: 결제 URL 생성 (실제로는 토스페이먼츠에서 받아옴)
      const paymentUrl = `https://pay.toss.im/...`; // TODO: 실제 토스페이먼츠 URL

      // paymentKey가 없으면 업데이트 (토스페이먼츠에서 받은 경우)
      if (!paymentData.paymentKey) {
        // await paymentRef.update({
        //   paymentKey: tossPayment.paymentKey,
        //   updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // });
      }

      logger.info("[createPaymentRequest] 결제 요청 생성", {
        applicationId,
        orderId: paymentData.orderId,
        amount: totalAmount,
      });

      // 5. 결제 URL 반환
      return {
        paymentId: applicationId, // v2: applicationId와 동일
        paymentUrl: paymentUrl,
        amount: totalAmount,
        orderId: paymentData.orderId,
      };
    } catch (error: any) {
      logger.error("[createPaymentRequest] 오류:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        error.message || "결제 요청 생성 실패"
      );
    }
  }
);
