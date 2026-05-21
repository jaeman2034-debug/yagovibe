/**
 * 🔥 Phone Auth 이벤트 로그 수집 (운영 관측)
 * 
 * 역할:
 * - SMS 요청 / 성공 / 실패 전부 기록
 * - DAILY_LIMIT, too-many-requests 실제 발생률 파악
 * - 나중에 차단/완화/UX 개선 근거 데이터 확보
 * 
 * 원칙:
 * ❌ 콘솔 로그만 → 운영에서 쓸모 없음
 * ✅ 이벤트 단위 로그 → 나중에 다 살림
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export type PhoneAuthEventType = 
  | "sms_request" 
  | "sms_success" 
  | "sms_error" 
  | "verify_success" 
  | "verify_error";

export interface PhoneAuthEvent {
  uid: string | null;
  phoneNumber: string | null;
  type: PhoneAuthEventType;
  errorCode?: string | null;
  errorMessage?: string | null;
  userAgent?: string;
  createdAt: any; // serverTimestamp
}

/**
 * Phone Auth 관련 이벤트 로그
 * 
 * @param params - 이벤트 파라미터
 */
export async function logPhoneAuthEvent(params: {
  type: PhoneAuthEventType;
  phoneNumber?: string;
  errorCode?: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    const event: PhoneAuthEvent = {
      uid: auth.currentUser?.uid ?? null,
      phoneNumber: params.phoneNumber ?? null,
      type: params.type,
      errorCode: params.errorCode ?? null,
      errorMessage: params.errorMessage ?? null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "auth_logs"), event);
    
    console.log("📊 [authLogger] 이벤트 로그 저장:", {
      type: params.type,
      phoneNumber: params.phoneNumber ? params.phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3") : null,
      errorCode: params.errorCode,
    });
  } catch (error) {
    // 🔇 로깅 실패는 UX에 영향 주면 안 됨
    console.error("⚠️ [authLogger] 이벤트 로그 저장 실패 (무시):", error);
  }
}
