/**
 * 🔔 FCM (Firebase Cloud Messaging) 테스트 유틸리티
 * 
 * 사용법:
 *   import { requestPermissionAndGetToken } from "@/lib/fcm";
 *   const token = await requestPermissionAndGetToken();
 *
 * FCM은 `src/lib/firebase`의 단일 `app`을 사용한다 (별도 initializeApp 금지).
 */

import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { isSupported } from "firebase/messaging";
import { app } from "@/lib/firebase";

// FCM 지원 여부 확인 후 Messaging 인스턴스 생성
let messaging: Messaging | null = null;

const initMessaging = async (): Promise<Messaging | null> => {
    if (messaging) return messaging;

    try {
        const isSupportedBrowser = await isSupported();
        if (!isSupportedBrowser) {
            console.warn("⚠️ 이 브라우저는 FCM을 지원하지 않습니다.");
            return null;
        }
        messaging = getMessaging(app);
        return messaging;
    } catch (error) {
        console.error("❌ FCM 초기화 오류:", error);
        return null;
    }
};

/**
 * 브라우저 알림 권한 요청 및 FCM 토큰 획득
 * @returns FCM 등록 토큰 또는 null
 */
export const requestPermissionAndGetToken = async (): Promise<string | null> => {
    console.log("🔔 브라우저 알림 권한 요청 중...");

    try {
        const messagingInstance = await initMessaging();
        if (!messagingInstance) {
            console.error("❌ FCM을 초기화할 수 없습니다.");
            return null;
        }

        // 알림 권한 요청
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            console.log("✅ 알림 권한 허용됨!");

            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("❌ VITE_FIREBASE_VAPID_KEY가 설정되지 않았습니다.");
                return null;
            }

            // FCM 토큰 획득
            const token = await getToken(messagingInstance, { vapidKey });
            if (token) {
                console.log("📱 FCM 등록 토큰:", token);
                console.log("📋 토큰을 복사하려면:", token);

                // 클립보드에 복사 (선택사항)
                if (navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(token);
                        console.log("✅ 토큰이 클립보드에 복사되었습니다!");
                    } catch (clipboardError) {
                        console.warn("⚠️ 클립보드 복사 실패:", clipboardError);
                    }
                }

                return token;
            } else {
                console.warn("⚠️ FCM 토큰을 가져올 수 없습니다. Service Worker가 등록되었는지 확인하세요.");
                return null;
            }
        } else {
            console.warn("🚫 알림 권한 거부됨! 브라우저 설정에서 알림을 허용해주세요.");
            return null;
        }
    } catch (error) {
        console.error("❌ FCM 토큰 획득 중 오류:", error);
        return null;
    }
};

/**
 * 포그라운드 메시지 수신 핸들러 설정
 */
export const setupForegroundMessageHandler = () => {
    initMessaging().then((messagingInstance) => {
        if (!messagingInstance) return;

        onMessage(messagingInstance, (payload) => {
            console.log("💬 포그라운드 메시지 수신:", payload);

            // 브라우저 알림 표시
            if ("Notification" in window && Notification.permission === "granted") {
                const notification = payload.notification;
                if (notification) {
                    const notificationOptions: NotificationOptions = {
                        body: notification.body,
                        icon: notification.icon || "/icons/icon-maskable-512.png",
                        badge: "/icons/icon-maskable-512.png",
                        tag: payload.data?.tag || "yago-vibe",
                        data: payload.data,
                    };

                    // 새 알림 생성 및 표시
                    new Notification(notification.title || "YAGO SPORTS", notificationOptions);
                }
            }

            // 추가적으로 alert로도 표시 (개발용)
            if (payload.notification) {
                alert(`📢 ${payload.notification.title || "YAGO SPORTS"}\n${payload.notification.body || ""}`);
            }
        });

        console.log("✅ 포그라운드 메시지 핸들러 설정 완료");
    });
};

/**
 * 현재 FCM 토큰 가져오기 (권한이 이미 있는 경우)
 */
export const getCurrentToken = async (): Promise<string | null> => {
    try {
        const messagingInstance = await initMessaging();
        if (!messagingInstance) return null;

        const permission = Notification.permission;
        if (permission !== "granted") {
            console.warn("⚠️ 알림 권한이 허용되지 않았습니다.");
            return null;
        }

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) return null;

        const token = await getToken(messagingInstance, { vapidKey });
        return token;
    } catch (error) {
        console.error("❌ 토큰 가져오기 오류:", error);
        return null;
    }
};

