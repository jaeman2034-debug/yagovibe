// src/lib/pushNotifications.ts
/**
 * 🔥 실서비스 수준 푸시 알림 초기화 (최종 버전)
 * Capacitor 환경에서만 작동
 */

import { PushNotifications } from "@capacitor/push-notifications";
import { Device } from "@capacitor/device";
import { saveDeviceToken } from "./saveDeviceToken";

export async function registerPushNotifications() {
  const info = await Device.getInfo();

  // 웹에서는 스킵
  if (info.platform === "web") {
    console.log("🌐 Web platform → push registration skipped");
    return;
  }

  // 권한 확인 및 요청
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === "prompt") {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== "granted") {
    console.warn("❌ Push permission not granted");
    return;
  }

  // 푸시 등록
  await PushNotifications.register();

  // 토큰 수신
  PushNotifications.addListener("registration", async (token) => {
    console.log("🔥 Device FCM Token:", token.value);
    await saveDeviceToken(token.value, info.platform);
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("❌ Push registration error:", err);
  });

  // 알림 수신 로그
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("📩 Push received:", notification);
  });

  // 알림 클릭 시 라우팅
  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      console.log("🖱 Push clicked:", action);

      const route = action.notification.data?.route;
      if (route) {
        // React Router를 쓰고 있어서 window.location.href로 넘겨도 됨.
        // (Capacitor WebView 안에서 동작)
        window.location.href = route;
      } else {
        // route 없으면 기본 홈으로
        window.location.href = "/sports-hub";
      }
    }
  );
}

// 기존 함수명 호환성 유지
export const initPush = registerPushNotifications;

