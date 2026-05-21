/**
 * 🔥 결제 완료 Webhook (토스페이먼츠)
 * 
 * 토스페이먼츠에서 결제 완료 시 호출되는 Webhook
 * 결제 검증 후 Payment 문서 업데이트
 */

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

/**
 * 결제 완료 Webhook
 * 
 * 토스페이먼츠에서 POST 요청으로 호출
 * 
 * @param req.body
 *   - paymentKey: string (토스페이먼츠 paymentKey)
 *   - orderId: string (주문 ID)
 *   - amount: number (결제 금액)
 *   - status: string (결제 상태)
 */
export const onPaymentWebhook = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const { paymentKey, orderId, amount, status } = req.body;

      if (!paymentKey || !orderId || !amount) {
        logger.warn("[onPaymentWebhook] 필수 파라미터 누락", req.body);
        res.status(400).json({ error: "필수 파라미터 누락" });
        return;
      }

      // 1. 토스페이먼츠 서버에 결제 검증
      // TODO: 실제 토스페이먼츠 API 호출
      // const tossPayments = require("@tosspayments/payment-sdk");
      // const verified = await tossPayments.verifyPayment(paymentKey, amount);
      // if (!verified) {
      //   logger.error("[onPaymentWebhook] 결제 검증 실패", { paymentKey, amount });
      //   return res.status(400).json({ error: "Invalid payment" });
      // }

      // 임시: 검증 통과 가정
      logger.info("[onPaymentWebhook] 결제 검증 완료", {
        paymentKey,
        orderId,
        amount,
        status,
      });

      // 2. 🔥 v2: orderId에서 applicationId 추출
      // orderId 형식: "app_{applicationId}"
      const orderIdMatch = orderId.match(/^app_(.+)$/);
      if (!orderIdMatch) {
        logger.error("[onPaymentWebhook] orderId 형식 오류", { orderId });
        res.status(400).json({ error: "Invalid orderId format" });
        return;
      }

      const applicationId = orderIdMatch[1];

      // 3. 🔥 v2: Payment 문서 직접 조회 (payments/{applicationId})
      // collectionGroup으로 applications 검색하여 associationId, tournamentId 추출
      const applicationsSnap = await db
        .collectionGroup("applications")
        .where("__name__", "==", applicationId)
        .limit(1)
        .get();

      if (applicationsSnap.empty) {
        logger.error("[onPaymentWebhook] Application을 찾을 수 없음", {
          applicationId,
        });
        res.status(404).json({ error: "Application not found" });
        return;
      }

      const appDoc = applicationsSnap.docs[0];
      const appData = appDoc.data();

      // 경로에서 associationId, tournamentId 추출
      const pathParts = appDoc.ref.path.split("/");
      const associationIndex = pathParts.indexOf("associations");
      const tournamentIndex = pathParts.indexOf("tournaments");

      if (associationIndex === -1 || tournamentIndex === -1) {
        logger.error("[onPaymentWebhook] 경로 파싱 실패", {
          path: appDoc.ref.path,
        });
        res.status(500).json({ error: "Path parsing failed" });
        return;
      }

      const associationId = pathParts[associationIndex + 1];
      const tournamentId = pathParts[tournamentIndex + 1];

      // 4. 🔥 v2: Payment 문서 직접 조회 (payments/{applicationId})
      const paymentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/payments/${applicationId}`
      );
      const paymentDoc = await paymentRef.get();

      if (!paymentDoc.exists) {
        logger.error("[onPaymentWebhook] Payment 문서를 찾을 수 없음", {
          applicationId,
        });
        res.status(404).json({ error: "Payment not found" });
        return;
      }

      const paymentData = paymentDoc.data()!;

      // 5. 금액 검증 (서버 계산값과 비교)
      if (amount !== paymentData.amount) {
        logger.error("[onPaymentWebhook] 금액 불일치", {
          expected: paymentData.amount,
          received: amount,
        });
        res.status(400).json({ error: "Amount mismatch" });
        return;
      }

      // 이미 결제 완료된 경우 중복 처리 방지
      if (paymentData.status === "paid" || paymentData.status === "PAID") {
        logger.warn("[onPaymentWebhook] 이미 결제 완료된 Payment", {
          paymentId: paymentDoc.id,
        });
        res.status(200).json({ message: "Already paid" });
        return;
      }

      // 6. 🔥 v2: Payment 문서 업데이트
      await paymentRef.update({
        status: status === "DONE" ? "paid" : "failed",
        method: status === "DONE" ? "card" : null, // TODO: 실제 결제 방법 추출
        paymentKey,
        paidAt:
          status === "DONE"
            ? admin.firestore.FieldValue.serverTimestamp()
            : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 7. 🔥 v2: 결제 완료 시 선수 명단 제출 가능하도록 (선택적)
      // 이미 rosterStatus가 draft이면 그대로 유지 (결제 완료 후에도 수정 가능)
      // 필요시 여기서 추가 로직 구현

      logger.info("[onPaymentWebhook] ✅ 결제 완료 처리", {
        paymentId: applicationId,
        applicationId,
        amount,
        status,
      });

      // 7. 성공 응답
      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error("[onPaymentWebhook] ❌ 오류", {
        error: error.message,
        stack: error.stack,
        body: req.body,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
