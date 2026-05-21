/**
 * 🔥 SMS 시도 로그 (어뷰징 모니터링)
 * 
 * 역할:
 * - Firestore에 SMS 시도 로그 저장
 * - 운영자 모니터링 포인트 제공
 * - 어뷰징 패턴 분석 가능
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "firebase/auth";

export interface SMSLogEntry {
  phone: string;
  uid: string | null;
  ip?: string;
  userAgent?: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  createdAt: any; // serverTimestamp
}

/**
 * SMS 시도 로그 저장
 * 
 * @param phoneNumber - 전화번호
 * @param success - 성공 여부
 * @param user - Firebase Auth User (선택)
 * @param error - 에러 객체 (선택)
 */
export async function logSMSAttempt(
  phoneNumber: string,
  success: boolean,
  user?: User | null,
  error?: any
): Promise<void> {
  // 🔥 임시: SMS 발송 문제 해결을 위해 로그 저장 주석 처리
  // errorCode가 undefined일 때 Firestore 규칙 오류 발생 가능성 제거
  /*
  try {
    const logEntry: SMSLogEntry = {
      phone: phoneNumber,
      uid: user?.uid ?? null,
      userAgent: navigator.userAgent,
      success,
      errorCode: error?.code,
      errorMessage: error?.message,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "smsLogs"), logEntry);
    console.log("📊 [smsLogging] SMS 시도 로그 저장:", {
      phone: phoneNumber,
      success,
      errorCode: error?.code,
    });
  } catch (logError) {
    // 로그 저장 실패해도 SMS 전송은 계속 진행
    console.error("⚠️ [smsLogging] SMS 로그 저장 실패 (무시):", logError);
  }
  */
  
  // 🔥 임시: 콘솔 로그만 남김
  console.log("📊 [smsLogging] SMS 시도 (로그 저장 임시 비활성화):", {
    phone: phoneNumber,
    success,
    errorCode: error?.code,
  });
}
