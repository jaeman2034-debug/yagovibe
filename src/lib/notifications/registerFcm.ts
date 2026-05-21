/**
 * 🔔 FCM 토큰 등록 유틸리티
 * 
 * 사용자 로그인 후 FCM 토큰을 발급받아 Firestore에 저장합니다.
 */

import { getMessaging, getToken, onMessage, isSupported, type MessagePayload } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 🔥 VAPID 키는 환경 변수에서 가져옴
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * FCM 토큰을 발급받아 Firestore에 저장합니다.
 * 
 * @param uid 사용자 UID
 * @returns FCM 토큰 (실패 시 null)
 */
export async function registerFcmToken(uid: string): Promise<string | null> {
  try {
    // 🔥 브라우저 지원 확인
    if (typeof window === "undefined") {
      console.warn("⚠️ [registerFcm] 서버 사이드에서는 FCM 토큰을 발급할 수 없습니다.");
      return null;
    }

    // 🔥 Firebase Messaging 기능 지원 여부 체크 (필수)
    try {
      const supported = await isSupported();
      if (!supported) {
        console.warn("⚠️ [registerFcm] 현재 환경은 FCM을 지원하지 않습니다.");
        return null;
      }
    } catch (e) {
      // 일부 브라우저에서 isSupported 자체가 예외를 던질 수 있음
      console.warn("⚠️ [registerFcm] FCM 지원 여부 확인 실패, 사용 불가로 간주:", e);
      return null;
    }

    // 🔥 Service Worker 지원 확인
    if (!("serviceWorker" in navigator)) {
      console.warn("⚠️ [registerFcm] Service Worker가 지원되지 않습니다.");
      return null;
    }

    // 🔥 VAPID 키 확인
    if (!VAPID_KEY) {
      console.error("❌ [registerFcm] VITE_FIREBASE_VAPID_KEY가 설정되지 않았습니다.");
      return null;
    }

    // 명시적으로 권한 요청 (default 상태 방치 방지)
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("⚠️ [registerFcm] 알림 권한이 허용되지 않았습니다:", permission);
        return null;
      }
    }

    // 🔥 Firebase Messaging 초기화 (브라우저 지원 확인 후)
    let messaging;
    try {
      messaging = getMessaging();
    } catch (error: any) {
      if (error?.code === "messaging/unsupported-browser") {
        console.warn("⚠️ [registerFcm] FCM이 지원되지 않는 브라우저입니다.");
        return null;
      }
      throw error;
    }
    
    // 🔥 FCM 토큰 발급
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (!token) {
      console.warn("⚠️ [registerFcm] FCM 토큰을 발급받을 수 없습니다. 알림 권한을 확인하세요.");
      return null;
    }

    console.log("✅ [registerFcm] FCM 토큰 발급 성공:", token.substring(0, 20) + "...");

    // 🔥 Firestore에 토큰 저장 (중복 방지: arrayUnion 사용)
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
    });

    console.log("✅ [registerFcm] FCM 토큰 저장 완료:", uid);
    return token;
  } catch (error: any) {
    console.error("❌ [registerFcm] FCM 토큰 등록 실패:", error);
    
    // 🔥 알림 권한 거부 에러 처리
    if (error.code === "messaging/permission-blocked") {
      console.warn("⚠️ [registerFcm] 알림 권한이 거부되었습니다.");
    } else if (error.code === "messaging/permission-default") {
      console.warn("⚠️ [registerFcm] 알림 권한이 아직 요청되지 않았습니다.");
    }
    
    return null;
  }
}

/**
 * 포그라운드 메시지 수신 핸들러
 * (앱이 열려 있을 때 푸시 알림을 받으면 호출됨)
 * 
 * @param callback 메시지 수신 시 호출할 콜백 함수
 * @returns 구독 해제 함수
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): () => void {
  // 안전 가드(동기): 브라우저/서비스워커/알림 API 미지원 시 즉시 noop 반환
  if (typeof window === "undefined" || typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("⚠️ [registerFcm] 현재 환경은 FCM 포그라운드 메시지를 지원하지 않습니다.");
    return () => {};
  }
  // 실제 리스너 등록은 isSupported 확인 후 비동기로 처리
  let unsubscribe: () => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    try {
      const ok = await isSupported();
      if (!ok) {
        console.warn("⚠️ [registerFcm] 현재 환경은 FCM 포그라운드 메시지를 지원하지 않습니다.");
        return;
      }
      const messaging = getMessaging();
      unsubscribe = onMessage(messaging, callback);
    } catch (error) {
      console.warn("⚠️ [registerFcm] 포그라운드 메시지 핸들러 등록 건너뜀:", error);
    }
  })();
  // 즉시 반환: 나중에 설정된 unsubscribe를 호출
  return () => unsubscribe();
}
