import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "@/lib/firebase";
import { resolveFcmDeepLinkRoute } from "@/utils/fcmDeepLinkRoute";

export const useFCM = () => {
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    navigateRef.current = navigate;
    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    // 🔹 브라우저 권한 요청 및 토큰 획득
    const requestPermission = async () => {
        console.log("🔔 알림 권한 요청 중...");
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            console.log("✅ 알림 권한 허용됨!");
            try {
                const token = await getToken(messaging, { vapidKey });
                console.log("🔥 FCM 토큰 발급 성공:", token);
                localStorage.setItem("fcm_token", token);
                return token;
            } catch (err) {
                console.error("❌ FCM 토큰 요청 실패:", err);
            }
        } else {
            console.warn("🚫 알림 권한 거부됨");
        }
    };

    // 🔹 실시간 메시지 리스너
    const listenMessages = () => {
        onMessage(messaging, (payload) => {
            console.log("📨 포그라운드 메시지:", payload);
            const { title, body } = payload.notification ?? {};
            if (typeof Notification === "undefined" || Notification.permission !== "granted") {
                return;
            }
            const tag =
                (payload.data as Record<string, string> | undefined)?.messageId ?? "fcm-test";
            const n = new Notification(title ?? "새 알림", {
                body: body ?? "메시지가 도착했습니다.",
                icon: "/icons/icon-maskable-512.png",
                tag,
            });
            n.onclick = () => {
                window.focus();
                n.close();
                const route = resolveFcmDeepLinkRoute(payload.data);
                if (route) navigateRef.current(route);
            };
        });
    };

    useEffect(() => {
        requestPermission();
        listenMessages();
    }, []);

    return { requestPermission, listenMessages };
};

