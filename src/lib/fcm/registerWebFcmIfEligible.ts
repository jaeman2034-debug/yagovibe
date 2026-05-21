/**
 * 웹(PWA) 로그인 후 FCM 등록 — Capacitor `registerPushNotifications`는 web에서 스킵되므로 여기서만 처리
 * 토큰은 `users/{uid}/devices/*` (saveDeviceToken) + `users/{uid}/fcmTokens/{token}` (CF 푸시 핸들러 호환)
 */

import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { app, auth, db } from "@/lib/firebase";
import { saveDeviceToken } from "@/lib/saveDeviceToken";

const SESSION_KEY = "yago_fcm_web_ok_uid";

function isWebFcmRegistrationDisabled(): boolean {
  const v = import.meta.env.VITE_DISABLE_WEB_FCM as string | undefined;
  if (v == null || String(v).trim() === "") return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export async function registerWebFcmIfEligible(): Promise<void> {
  if (typeof window === "undefined") return;

  if (isWebFcmRegistrationDisabled()) {
    console.info("[registerWebFcmIfEligible] VITE_DISABLE_WEB_FCM — 웹 FCM 등록 스킵");
    return;
  }

  const user = auth.currentUser;
  if (!user?.uid || user.isAnonymous) return;

  if (sessionStorage.getItem(SESSION_KEY) === user.uid) return;

  try {
    if (!(await isSupported())) return;
  } catch {
    return;
  }

  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey?.trim()) {
    console.warn("[registerWebFcmIfEligible] VITE_FIREBASE_VAPID_KEY 없음 — 웹 푸시 스킵");
    return;
  }

  try {
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: vapidKey.trim() });
    if (!token) return;

    await saveDeviceToken(token, "web");

    await setDoc(
      doc(db, "users", user.uid, "fcmTokens", token),
      { token, platform: "web", updatedAt: serverTimestamp() },
      { merge: true }
    );

    sessionStorage.setItem(SESSION_KEY, user.uid);
    if (import.meta.env.DEV) {
      console.log("[registerWebFcmIfEligible] 웹 FCM 토큰 저장 완료");
    }
  } catch (e) {
    console.warn("[registerWebFcmIfEligible] 웹 FCM 등록 실패 (무시):", e);
  }
}

/** 로그아웃·계정 전환 시 동일 세션에서 재등록 허용 */
export function clearWebFcmSessionFlag(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
