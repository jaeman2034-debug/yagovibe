/**
 * 🔥 결제 생성 Cloud Function
 * 
 * 역할:
 * - 클라이언트에서 금액/권한 절대 믿지 않음
 * - 서버에서 신뢰도 검증
 * - 주문 ID 생성
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();

export const createPayment = onCall(async (request) => {
  const { auth, data } = request;

  // 🔥 인증 확인
  if (!auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const uid = auth.uid;
  const { amount, orderName, itemId, metadata, requiresDeposit, depositAmount } = data;

  // 🔥 입력 검증
  if (!amount || amount <= 0) {
    throw new HttpsError("invalid-argument", "결제 금액이 올바르지 않습니다.");
  }

  if (!orderName || !itemId) {
    throw new HttpsError("invalid-argument", "주문 정보가 올바르지 않습니다.");
  }

  // 🔥 사용자 데이터 조회
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new HttpsError("not-found", "사용자를 찾을 수 없습니다.");
  }

  const userData = userSnap.data();
  const trustTier = userData?.trustTier || "basic";
  const isProfileComplete = userData?.isProfileComplete || false;

  // 🔥 권한 검증 (서버에서 재확인)
  if (trustTier !== "verified" && trustTier !== "host") {
    throw new HttpsError("permission-denied", "결제 권한이 없습니다. 신뢰도 등급이 부족합니다.");
  }

  if (!isProfileComplete) {
    throw new HttpsError("permission-denied", "프로필을 완성해주세요.");
  }

  // 🔥 주문 ID 생성
  const orderId = `order_${uid}_${Date.now()}_${itemId}`;

  // 🔥 결제 정보 저장 (대기 상태)
  await db.collection("payments").doc(orderId).set({
    uid,
    orderId,
    amount,
    orderName,
    itemId,
    metadata: metadata || {},
    requiresDeposit: requiresDeposit || false,
    depositAmount: depositAmount || 0,
    status: "pending",
    createdAt: new Date(),
  });

  console.log("✅ [createPayment] 결제 생성 완료:", { orderId, uid, amount });

  return {
    orderId,
    amount,
  };
});
