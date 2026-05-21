/**
 * 🔥 토스페이먼츠 결제 연동 v1
 * 
 * 역할:
 * - 클라이언트 결제 호출
 * - 결제 성공/실패 처리
 * - 신뢰도 연동
 */

import { loadTossPayments } from "@tosspayments/payment-sdk";
import { checkPaymentAllowed, logPaymentAttempt, logPaymentSuccess } from "./paymentGuard";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PaymentRequest {
  amount: number;
  orderName: string;
  itemId: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  paymentKey?: string;
  error?: string;
}

/**
 * 토스페이먼츠 결제 요청
 * 
 * @param request - 결제 요청 정보
 * @param user - Firebase Auth User
 * @param userData - Firestore user 데이터 (선택)
 * @returns PaymentResult
 */
export async function requestTossPayment(
  request: PaymentRequest,
  user: any,
  userData?: any
): Promise<PaymentResult> {
  try {
    // 🔥 결제 가능 여부 확인
    const paymentCheck = checkPaymentAllowed(user, userData, request.amount);
    
    if (!paymentCheck.allowed) {
      return {
        success: false,
        error: paymentCheck.reason || "결제 권한이 없습니다.",
      };
    }

    // 🔥 결제 시도 로그
    await logPaymentAttempt(user.uid, request.amount, request.itemId, user);

    // 🔥 서버에서 결제 생성 (Cloud Function 호출)
    const { httpsCallable } = await import("firebase/functions");
    const { functions } = await import("@/lib/firebase");
    const createPayment = httpsCallable(functions, "createPayment");

    const { data } = await createPayment({
      amount: request.amount,
      orderName: request.orderName,
      itemId: request.itemId,
      metadata: request.metadata,
      requiresDeposit: paymentCheck.requiresDeposit,
      depositAmount: paymentCheck.depositAmount,
    });

    const { orderId, amount } = data as { orderId: string; amount: number };

    // 🔥 토스페이먼츠 SDK 로드
    const tossPayments = await loadTossPayments(
      import.meta.env.VITE_TOSS_CLIENT_KEY || ""
    );

    const origin = window.location.origin;

    // 🔥 결제 요청
    await tossPayments.requestPayment("카드", {
      amount,
      orderId,
      orderName: request.orderName,
      successUrl: `${origin}/pay/success?orderId=${orderId}&paymentKey={paymentKey}&amount=${amount}`,
      failUrl: `${origin}/pay/fail?orderId=${orderId}&code={code}&message={message}`,
    });

    return {
      success: true,
      orderId,
    };
  } catch (error: any) {
    console.error("❌ [tossPayment] 결제 요청 실패:", error);
    
    return {
      success: false,
      error: error.message || "결제 요청에 실패했습니다.",
    };
  }
}

/**
 * 결제 성공 처리 (콜백 페이지에서 호출)
 * 
 * @param orderId - 주문 ID
 * @param paymentKey - 결제 키
 * @param amount - 결제 금액
 */
export async function handlePaymentSuccess(
  orderId: string,
  paymentKey: string,
  amount: number
): Promise<void> {
  try {
    // 🔥 서버 검증 (Cloud Function 호출)
    const { httpsCallable, getFunctions } = await import("firebase/functions");
    const { app } = await import("@/lib/firebase");
    const functions = getFunctions(app);
    const verifyPayment = httpsCallable(functions, "verifyPayment");

    const { data } = await verifyPayment({
      orderId,
      paymentKey,
      amount,
    });

    const { success, transactionId } = data as { success: boolean; transactionId: string };

    if (!success) {
      throw new Error("결제 검증 실패");
    }

    // 🔥 결제 성공 로그
    const { getAuth } = await import("firebase/auth");
    const { auth } = await import("@/lib/firebase");
    const user = auth.currentUser;

    if (user) {
      // itemId는 orderId에서 추출 (예: order_uid_timestamp_itemId)
      const itemId = orderId.split("_").pop() || orderId;
      await logPaymentSuccess(user.uid, amount, itemId, transactionId, user);
    }

    console.log("✅ [tossPayment] 결제 성공 처리 완료:", { orderId, transactionId });
  } catch (error) {
    console.error("❌ [tossPayment] 결제 성공 처리 실패:", error);
    throw error;
  }
}
