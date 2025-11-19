/**
 * 푸시 알림 초기화
 * 
 * Firebase Cloud Messaging (FCM)을 사용한 푸시 알림 설정
 */

export async function initPush() {
  // Capacitor 네이티브 플랫폼인지 확인
  const isNative = (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) ?? false;
  if (!isNative) {
    console.log("푸시 알림은 네이티브 앱에서만 사용 가능합니다.");
    return;
  }

  try {
    // 동적 import로 푸시 알림 플러그인 로드
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let perm = await PushNotifications.checkPermissions();
    
    if (perm.receive === "prompt") {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive !== "granted") {
      console.log("푸시 권한 거부됨");
      return;
    }

    PushNotifications.register();

    PushNotifications.addListener("registration", (token) => {
      console.log("푸시 토큰:", token.value);
      // TODO: 서버에 토큰 전송
    });

    PushNotifications.addListener("registrationError", (error) => {
      console.error("푸시 등록 오류:", error);
    });

    PushNotifications.addListener("pushNotificationReceived", (notif) => {
      console.log("푸시 메시지 수신:", notif);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("푸시 액션 수행:", action);
    });
  } catch (error) {
    console.error("푸시 알림 초기화 오류:", error);
  }
}

