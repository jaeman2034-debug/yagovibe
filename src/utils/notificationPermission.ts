/**
 * 🔥 알림 권한 요청 (리텐션 트리거)
 * 
 * 역할:
 * - 로그인 성공 직후 알림 권한 요청 (최적 타이밍)
 * - 재방문 훅 심기
 * - 리텐션 이벤트 로깅
 */

import { logNotificationPermission } from "./retentionEvents";
import type { User } from "firebase/auth";

/**
 * 알림 권한 요청 (로그인 직후 최적 타이밍)
 * 
 * @param user - Firebase Auth User
 * @returns 권한 획득 여부
 */
export async function requestNotificationPermission(user: User): Promise<boolean> {
  // 🔥 브라우저 지원 확인
  if (!("Notification" in window)) {
    console.warn("⚠️ [notificationPermission] 브라우저가 알림을 지원하지 않습니다.");
    return false;
  }

  // 🔥 이미 권한이 있으면 로깅만
  if (Notification.permission === "granted") {
    await logNotificationPermission(user, true);
    return true;
  }

  // 🔥 거부된 경우
  if (Notification.permission === "denied") {
    console.warn("⚠️ [notificationPermission] 알림 권한이 거부되었습니다.");
    await logNotificationPermission(user, false);
    return false;
  }

  // 🔥 권한 요청 (default 상태)
  try {
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";

    await logNotificationPermission(user, granted);

    if (granted) {
      console.log("✅ [notificationPermission] 알림 권한 획득 성공");
    } else {
      console.warn("⚠️ [notificationPermission] 알림 권한 거부됨");
    }

    return granted;
  } catch (error) {
    console.error("❌ [notificationPermission] 알림 권한 요청 실패:", error);
    await logNotificationPermission(user, false);
    return false;
  }
}
