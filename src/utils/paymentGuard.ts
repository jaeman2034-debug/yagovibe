/**
 * 🔥 결제/예약 사전 준비 (안전장치)
 * 
 * 역할:
 * - 결제 전 필수 체크
 * - 노쇼/어뷰징 최소화
 * - 보증금 옵션 관리
 */

import { doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { canPay } from "./permissionLevel";
import { applyPenalty, updateTrustScore } from "./trustScore";
import type { User } from "firebase/auth";

export interface PaymentCheckResult {
  allowed: boolean;
  reason?: string;
  requiresDeposit: boolean;
  depositAmount?: number;
}

/**
 * 결제 가능 여부 확인 (상세)
 * 
 * @param user - Firebase Auth User
 * @param userData - Firestore user 데이터
 * @param amount - 결제 금액
 * @returns PaymentCheckResult
 */
export function checkPaymentAllowed(
  user: User | null,
  userData?: any,
  amount?: number
): PaymentCheckResult {
  // 🔥 기본 결제 가능 여부 확인
  if (!canPay(user, userData)) {
    return {
      allowed: false,
      reason: "신뢰도 등급이 부족합니다. 프로필을 완성하고 활동을 이어가주세요.",
      requiresDeposit: false,
    };
  }

  // 🔥 패널티가 3회 이상이면 보증금 필수
  const penalties = userData?.penalties || 0;
  const requiresDeposit = penalties >= 3;

  // 🔥 보증금 금액 계산 (결제 금액의 20% 또는 최소 10,000원)
  const depositAmount = requiresDeposit && amount
    ? Math.max(10000, Math.floor(amount * 0.2))
    : undefined;

  return {
    allowed: true,
    requiresDeposit,
    depositAmount,
  };
}

/**
 * 결제 시도 이벤트 로깅
 * 
 * @param uid - 사용자 UID
 * @param amount - 결제 금액
 * @param itemId - 결제 아이템 ID
 * @param user - Firebase Auth User (선택)
 */
export async function logPaymentAttempt(
  uid: string,
  amount: number,
  itemId: string,
  user?: User | null
): Promise<void> {
  try {
    const { collection, addDoc } = await import("firebase/firestore");
    await addDoc(collection(db, "paymentAttempts"), {
      uid,
      amount,
      itemId,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // 🔥 리텐션 이벤트 로깅
    if (user) {
      const { logPaymentAttempt: logRetentionPaymentAttempt } = await import("./retentionEvents");
      await logRetentionPaymentAttempt(user, amount, itemId);
    }

    console.log("📊 [paymentGuard] 결제 시도 로그:", { uid, amount, itemId });
  } catch (error) {
    console.error("❌ [paymentGuard] 결제 시도 로그 저장 실패:", error);
  }
}

/**
 * 결제 성공 이벤트 로깅
 * 
 * @param uid - 사용자 UID
 * @param amount - 결제 금액
 * @param itemId - 결제 아이템 ID
 * @param transactionId - 거래 ID
 */
export async function logPaymentSuccess(
  uid: string,
  amount: number,
  itemId: string,
  transactionId: string,
  user?: User | null
): Promise<void> {
  try {
    const { collection, addDoc } = await import("firebase/firestore");
    await addDoc(collection(db, "payments"), {
      uid,
      amount,
      itemId,
      transactionId,
      status: "completed",
      createdAt: serverTimestamp(),
    });

    // 🔥 신뢰도 스코어 업데이트 (결제 성공 시 +5점)
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      totalPayments: increment(1),
      totalPaymentAmount: increment(amount),
    });

    await updateTrustScore(uid);

    // 🔥 리텐션 이벤트 로깅
    if (user) {
      const { logPaymentSuccess: logRetentionPaymentSuccess } = await import("./retentionEvents");
      await logRetentionPaymentSuccess(user, amount, itemId, transactionId);
    }

    console.log("✅ [paymentGuard] 결제 성공 로그:", { uid, amount, itemId, transactionId });
  } catch (error) {
    console.error("❌ [paymentGuard] 결제 성공 로그 저장 실패:", error);
  }
}

/**
 * 노쇼 처리 (예약 불참)
 * 
 * @param uid - 사용자 UID
 * @param reservationId - 예약 ID
 */
export async function handleNoShow(
  uid: string,
  reservationId: string,
  user?: User | null
): Promise<void> {
  try {
    // 🔥 패널티 적용
    await applyPenalty(uid, `노쇼: ${reservationId}`);

    // 🔥 노쇼 기록
    const { collection, addDoc } = await import("firebase/firestore");
    await addDoc(collection(db, "noShows"), {
      uid,
      reservationId,
      createdAt: serverTimestamp(),
    });

    // 🔥 리텐션 이벤트 로깅
    if (user) {
      const { logNoShowPenalty: logRetentionNoShowPenalty } = await import("./retentionEvents");
      await logRetentionNoShowPenalty(user, reservationId);
    }

    console.log("⚠️ [paymentGuard] 노쇼 처리:", { uid, reservationId });
  } catch (error) {
    console.error("❌ [paymentGuard] 노쇼 처리 실패:", error);
  }
}

/**
 * 보증금 반환 처리
 * 
 * @param uid - 사용자 UID
 * @param reservationId - 예약 ID
 * @param depositAmount - 보증금 금액
 */
export async function refundDeposit(
  uid: string,
  reservationId: string,
  depositAmount: number
): Promise<void> {
  try {
    const { collection, addDoc } = await import("firebase/firestore");
    await addDoc(collection(db, "depositRefunds"), {
      uid,
      reservationId,
      depositAmount,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    console.log("💰 [paymentGuard] 보증금 반환 요청:", { uid, reservationId, depositAmount });
  } catch (error) {
    console.error("❌ [paymentGuard] 보증금 반환 요청 실패:", error);
  }
}
