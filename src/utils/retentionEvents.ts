/**
 * 🔥 리텐션 이벤트 로깅 (운영 핵심)
 * 
 * 역할:
 * - 로그인 성공 이벤트 기록
 * - 첫 행동 선택 이벤트 기록
 * - D1 / D7 리텐션 계산 가능
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "firebase/auth";

export type RetentionEventType =
  | "login_success"
  | "first_action_selected"
  | "notification_permission_granted"
  | "home_viewed"
  | "profile_completed"
  | "onboarding_completed"
  | "trust_score_updated"
  | "payment_attempt"
  | "payment_success"
  | "no_show_penalty"
  | "account_deleted" // 🔥 탈퇴 이벤트
  | "account_dormant"; // 🔥 휴면 전환 이벤트

export interface RetentionEvent {
  event: RetentionEventType;
  uid: string;
  metadata?: Record<string, any>;
  createdAt: any; // serverTimestamp
}

/**
 * 리텐션 이벤트 로깅
 * 
 * @param eventType - 이벤트 타입
 * @param user - Firebase Auth User
 * @param metadata - 추가 메타데이터 (선택)
 */
export async function logRetentionEvent(
  eventType: RetentionEventType,
  user: User,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const event: RetentionEvent = {
      event: eventType,
      uid: user.uid,
      metadata: metadata || {},
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "eventLogs"), event);
    console.log("📊 [retentionEvents] 이벤트 로그 저장:", {
      event: eventType,
      uid: user.uid,
      metadata,
    });
  } catch (error) {
    // 로그 저장 실패해도 앱 동작은 계속
    console.error("⚠️ [retentionEvents] 이벤트 로그 저장 실패 (무시):", error);
  }
}

/**
 * 로그인 성공 이벤트 로깅
 */
export async function logLoginSuccess(user: User): Promise<void> {
  await logRetentionEvent("login_success", user, {
    provider: user.providerData[0]?.providerId || "unknown",
    phoneNumber: user.phoneNumber || null,
  });
}

/**
 * 첫 행동 선택 이벤트 로깅
 */
export async function logFirstAction(user: User, action: string): Promise<void> {
  await logRetentionEvent("first_action_selected", user, {
    action,
  });
}

/**
 * 알림 권한 획득 이벤트 로깅
 */
export async function logNotificationPermission(user: User, granted: boolean): Promise<void> {
  await logRetentionEvent("notification_permission_granted", user, {
    granted,
  });
}

/**
 * 신뢰도 스코어 업데이트 이벤트 로깅
 */
export async function logTrustScoreUpdate(user: User, trustScore: number, trustTier: string): Promise<void> {
  await logRetentionEvent("trust_score_updated", user, {
    trustScore,
    trustTier,
  });
}

/**
 * 결제 시도 이벤트 로깅
 */
export async function logPaymentAttempt(user: User, amount: number, itemId: string): Promise<void> {
  await logRetentionEvent("payment_attempt", user, {
    amount,
    itemId,
  });
}

/**
 * 결제 성공 이벤트 로깅
 */
export async function logPaymentSuccess(user: User, amount: number, itemId: string, transactionId: string): Promise<void> {
  await logRetentionEvent("payment_success", user, {
    amount,
    itemId,
    transactionId,
  });
}

/**
 * 노쇼 패널티 이벤트 로깅
 */
export async function logNoShowPenalty(user: User, reservationId: string): Promise<void> {
  await logRetentionEvent("no_show_penalty", user, {
    reservationId,
  });
}
