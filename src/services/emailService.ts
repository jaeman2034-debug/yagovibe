/**
 * 🔥 Email Service - 이메일 알림 서비스
 * 
 * 역할:
 * - SendGrid 연동 (향후)
 * - 이메일 구독 관리
 * - 이메일 발송 (Cloud Functions 호출)
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  EmailSubscription,
  EmailNotificationType,
} from "@/types/email";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/**
 * 이메일 구독 설정 조회
 */
export async function getEmailSubscription(
  userId: string
): Promise<EmailSubscription | null> {
  try {
    const subscriptionRef = doc(db, "email_subscriptions", userId);
    const subscriptionSnap = await getDoc(subscriptionRef);

    if (!subscriptionSnap.exists()) {
      return null;
    }

    return subscriptionSnap.data() as EmailSubscription;
  } catch (error) {
    console.error("[getEmailSubscription] 조회 실패:", error);
    return null;
  }
}

/**
 * 이메일 구독 설정 생성/업데이트
 */
export async function updateEmailSubscription(
  userId: string,
  email: string,
  preferences: Partial<EmailSubscription["preferences"]>,
  digestFrequency: EmailSubscription["digestFrequency"] = "none"
): Promise<void> {
  try {
    const subscriptionRef = doc(db, "email_subscriptions", userId);
    const subscriptionSnap = await getDoc(subscriptionRef);

    const defaultPreferences: EmailSubscription["preferences"] = {
      match_result: true,
      match_started: false,
      match_completed: true,
      media_uploaded: true,
      award_announced: true,
      event_started: false,
      event_completed: true,
      team_match_scheduled: true,
      player_achievement: true,
      weekly_digest: false,
      monthly_digest: false,
    };

    const updatedPreferences = {
      ...defaultPreferences,
      ...preferences,
    };

    if (subscriptionSnap.exists()) {
      // 업데이트
      await updateDoc(subscriptionRef, {
        email,
        preferences: updatedPreferences,
        digestFrequency,
        updatedAt: serverTimestamp(),
      });
    } else {
      // 생성
      await setDoc(subscriptionRef, {
        userId,
        email,
        enabled: true,
        preferences: updatedPreferences,
        digestFrequency,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("[updateEmailSubscription] 저장 실패:", error);
    throw error;
  }
}

/**
 * 이메일 구독 활성화/비활성화
 */
export async function toggleEmailSubscription(
  userId: string,
  enabled: boolean
): Promise<void> {
  try {
    const subscriptionRef = doc(db, "email_subscriptions", userId);
    await updateDoc(subscriptionRef, {
      enabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("[toggleEmailSubscription] 업데이트 실패:", error);
    throw error;
  }
}

/**
 * 특정 알림 타입 구독 설정
 */
export async function updateNotificationPreference(
  userId: string,
  type: EmailNotificationType,
  enabled: boolean
): Promise<void> {
  try {
    const subscriptionRef = doc(db, "email_subscriptions", userId);
    const subscriptionSnap = await getDoc(subscriptionRef);

    if (!subscriptionSnap.exists()) {
      throw new Error("구독 설정이 없습니다");
    }

    const currentPreferences =
      subscriptionSnap.data()?.preferences || {};

    await updateDoc(subscriptionRef, {
      preferences: {
        ...currentPreferences,
        [type]: enabled,
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("[updateNotificationPreference] 업데이트 실패:", error);
    throw error;
  }
}

/**
 * 이메일 발송 (Cloud Function 호출)
 * 
 * Note: 실제 이메일 발송은 Cloud Functions에서 처리
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  try {
    // Cloud Function 호출
    const sendEmailFunction = httpsCallable(functions, "sendEmail");
    await sendEmailFunction({
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("[sendEmail] 발송 실패:", error);
    throw error;
  }
}
