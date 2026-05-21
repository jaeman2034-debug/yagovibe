/**
 * 🔥 결제 기록 집계 자동 업데이트
 * payments 서브컬렉션 변경 시 applications의 paymentStatus/paidTotal/dueAmount 자동 갱신
 */

import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

const db = admin.firestore();

/**
 * 결제 기록 생성/수정/삭제 시 참가 신청의 결제 상태 자동 집계
 */
export const onPaymentWriteRecomputeStatus = onDocumentWritten(
  {
    document:
      "associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}/payments/{paymentId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const { associationId, tournamentId, applicationId } = event.params;

    try {
      // 모든 결제 기록 조회
      const paymentsSnap = await db
        .collection(
          `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}/payments`
        )
        .get();

      // paidTotal 계산 (PAID 상태인 결제만)
      let paidTotal = 0;
      let lastPaymentAt: admin.firestore.Timestamp | null = null;

      paymentsSnap.forEach((doc) => {
        const payment = doc.data();
        // 🔥 "PAID" 또는 "paid" 모두 처리 (대소문자 유연성)
        const status = payment.status?.toUpperCase();
        if ((status === "PAID" || status === "paid") && payment.amount) {
          paidTotal += payment.amount;
          if (payment.paidAt && (!lastPaymentAt || payment.paidAt > lastPaymentAt)) {
            lastPaymentAt = payment.paidAt;
          }
        }
      });

      // 참가 신청 문서 조회
      const appRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
      );
      const appSnap = await appRef.get();

      if (!appSnap.exists) {
        console.warn(`[onPaymentWriteRecomputeStatus] Application not found: ${applicationId}`);
        return;
      }

      const appData = appSnap.data()!;
      const totalFee = appData.feeCalc?.totalFee || 0;

      // paymentStatus 결정
      let paymentStatus: "UNPAID" | "PAID" | "PARTIAL";
      if (paidTotal >= totalFee) {
        paymentStatus = "PAID";
      } else if (paidTotal > 0) {
        paymentStatus = "PARTIAL";
      } else {
        paymentStatus = "UNPAID";
      }

      // dueAmount 계산
      const dueAmount = Math.max(0, totalFee - paidTotal);

      // 업데이트
      await appRef.update({
        paymentStatus,
        paidTotal,
        dueAmount,
        lastPaymentAt: lastPaymentAt || admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[onPaymentWriteRecomputeStatus] Updated: ${applicationId} - ${paymentStatus}, paidTotal: ${paidTotal}, dueAmount: ${dueAmount}`
      );
    } catch (error) {
      console.error(`[onPaymentWriteRecomputeStatus] Error:`, error);
      throw error;
    }
  }
);

