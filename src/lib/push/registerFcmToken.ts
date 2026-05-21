/**
 * 🔔 FCM 토큰 등록 유틸리티 (당근마켓 스타일)
 * 
 * 사용자 로그인 후 FCM 토큰을 발급받아 Firestore에 저장합니다.
 */

import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { arrayUnion, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * FCM 토큰을 발급받아 Firestore에 저장합니다.
 * 
 * @param uid 사용자 UID
 * @returns FCM 토큰 (실패 시 null)
 */
export async function registerFcmToken(uid: string): Promise<string | null> {
  try {
    // 🔥 웹 FCM 지원 여부 확인
    if (!(await isSupported())) {
      console.warn("⚠️ [registerFcmToken] FCM이 지원되지 않는 환경입니다.");
      return null;
    }

    // 🔥 알림 권한 요청
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("⚠️ [registerFcmToken] 알림 권한이 거부되었습니다.");
      return null;
    }

    // 🔥 VAPID 키 확인
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error("❌ [registerFcmToken] VITE_FIREBASE_VAPID_KEY가 설정되지 않았습니다.");
      return null;
    }

    // 🔥 Firebase Messaging 초기화 (브라우저 지원 확인 후)
    let messaging;
    try {
      messaging = getMessaging();
    } catch (error: any) {
      if (error?.code === "messaging/unsupported-browser") {
        console.warn("⚠️ [registerFcmToken] FCM이 지원되지 않는 브라우저입니다.");
        return null;
      }
      throw error;
    }
    
    // 🔥 FCM 토큰 발급
    const token = await getToken(messaging, {
      vapidKey,
    });

    if (!token) {
      console.warn("⚠️ [registerFcmToken] FCM 토큰을 발급받을 수 없습니다.");
      return null;
    }

    console.log("✅ [registerFcmToken] FCM 토큰 발급 성공:", token.substring(0, 20) + "...");

    // 🔥 Firestore에 토큰 저장
    // 문서가 없을 수도 있으니 setDoc merge로 안전하게 초기화
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { fcmTokens: [] }, { merge: true });
    
    // arrayUnion으로 중복 방지하며 토큰 추가
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
    });

    console.log("✅ [registerFcmToken] FCM 토큰 저장 완료:", uid);
    return token;
  } catch (error: any) {
    // 🔥 FCM 토큰 저장 실패는 앱 크래시를 유발하지 않도록 조용히 처리
    // 지도 렌더링 등 다른 기능에 영향을 주지 않도록 예외 처리 강화
    console.warn("⚠️ [registerFcmToken] FCM 토큰 등록 실패 (무시):", error?.message || error);
    
    // 🔥 알림 권한 관련 에러 처리
    if (error.code === "messaging/permission-blocked") {
      console.warn("⚠️ [registerFcmToken] 알림 권한이 차단되었습니다.");
    } else if (error.code === "messaging/permission-default") {
      console.warn("⚠️ [registerFcmToken] 알림 권한이 아직 요청되지 않았습니다.");
    } else if (error.code === "permission-denied" || error.code === "missing-or-insufficient-permissions") {
      // 🔥 Firestore 권한 오류는 조용히 처리 (지도 렌더링에 영향 없음)
      console.warn("⚠️ [registerFcmToken] Firestore 권한 오류 (무시)");
    }
    
    // 🔥 항상 null 반환 (앱 크래시 방지)
    return null;
  }
}
