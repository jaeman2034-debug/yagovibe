/**
 * 🔥 결제 검증 Cloud Function
 * 
 * 역할:
 * - 토스 API로 서버 검증
 * - 결제 정보 저장
 * - 신뢰도 업데이트
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "";

/**
 * 토스페이먼츠 결제 검증
 */
async function verifyWithToss(paymentKey: string, orderId: string, amount: number) {
  try {
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(TOSS_SECRET_KEY + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "토스 결제 검증 실패");
    }

    return await response.json();
  } catch (error: any) {
    console.error("❌ [verifyPayment] 토스 API 호출 실패:", error);
    throw new HttpsError("internal", "결제 검증에 실패했습니다.");
  }
}

export const verifyPayment = onCall(async (request) => {
  const { auth, data } = request;

  // 🔥 인증 확인
  if (!auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const uid = auth.uid;
  const { orderId, paymentKey, amount } = data;

  // 🔥 입력 검증
  if (!orderId || !paymentKey || !amount) {
    throw new HttpsError("invalid-argument", "결제 정보가 올바르지 않습니다.");
  }

  // 🔥 주문 정보 조회
  const paymentRef = db.collection("payments").doc(orderId);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    throw new HttpsError("not-found", "주문을 찾을 수 없습니다.");
  }

  const paymentData = paymentSnap.data();
  
  // 🔥 이미 처리된 결제인지 확인
  if (paymentData?.status === "completed") {
    return {
      success: true,
      transactionId: paymentData.transactionId,
      message: "이미 처리된 결제입니다.",
    };
  }

  // 🔥 금액 검증 (서버에서 재확인)
  if (paymentData?.amount !== amount) {
    throw new HttpsError("invalid-argument", "결제 금액이 일치하지 않습니다.");
  }

  // 🔥 토스 API로 결제 검증
  const tossResult = await verifyWithToss(paymentKey, orderId, amount);

  // 🔥 결제 정보 업데이트
  const transactionId = tossResult.transactionId || paymentKey;
  
  await paymentRef.update({
    status: "completed",
    paymentKey,
    transactionId,
    verifiedAt: new Date(),
    tossData: tossResult,
  });

  // 🔥 사용자 결제 통계 업데이트
  const userRef = db.collection("users").doc(uid);
  await userRef.update({
    totalPayments: (paymentData?.totalPayments || 0) + 1,
    totalPaymentAmount: (paymentData?.totalPaymentAmount || 0) + amount,
  });

  console.log("✅ [verifyPayment] 결제 검증 완료:", { orderId, transactionId, uid, amount });

  return {
    success: true,
    transactionId,
  };
});
