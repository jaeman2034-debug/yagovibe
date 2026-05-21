import { Capacitor } from "@capacitor/core";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { app, auth } from "@/lib/firebase";
import { resolveFcmDeepLinkRoute } from "@/utils/fcmDeepLinkRoute";
import { resolveTeamPushPathWithMembership } from "@/lib/fcm/guardTeamPushNavigation";
import {
  recordNotificationClicked,
  recordNotificationPushOpened,
} from "@/lib/notifications/recordNotificationEngagement";

/**
 * 웹(PWA) 전용: 포그라운드 FCM 수신 시 시스템 알림 표시 + 클릭 시 React Router로 이동.
 * 네이티브(Capacitor)는 `pushNotifications` 경로를 사용하므로 여기서는 등록하지 않음.
 */
const NOTIF_CLICK_QS = "__yago_nc";

export function WebFcmDeepLinkBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  /** SW 백그라운드 푸시 클릭 시 URL에 붙인 알림 ID → Firestore 기록 후 쿼리 제거 */
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const nid = sp.get(NOTIF_CLICK_QS);
    if (!nid?.trim()) return;
    void recordNotificationClicked(nid.trim());
    sp.delete(NOTIF_CLICK_QS);
    const qs = sp.toString();
    const next = `${location.pathname}${qs ? `?${qs}` : ""}${location.hash || ""}`;
    navigate(next, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate]);

  const goFcmTarget = (raw: ReturnType<typeof resolveFcmDeepLinkRoute>) => {
    void (async () => {
      if (!raw) return;
      const pathOnly = raw.split(/[?#]/)[0] || "";
      if (pathOnly.startsWith("/team/")) {
        const user = auth.currentUser;
        if (!user) {
          navigateRef.current(`/login?next=${encodeURIComponent(raw)}`);
          return;
        }
        const safe = await resolveTeamPushPathWithMembership(raw, user);
        navigateRef.current(safe);
        return;
      }
      navigateRef.current(raw);
    })();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let unsub: (() => void) | undefined;

    void (async () => {
      const ok = await isSupported().catch(() => false);
      if (!ok || cancelled) return;
      try {
        const messaging = getMessaging(app);
        unsub = onMessage(messaging, (payload) => {
          const title = payload.notification?.title ?? "알림";
          const body = payload.notification?.body ?? "";
          const route = resolveFcmDeepLinkRoute(payload.data);
          const data = payload.data as Record<string, string> | undefined;
          const notificationId = data?.notificationId;

          if (notificationId) {
            void recordNotificationPushOpened(notificationId);
          }

          if (typeof Notification === "undefined") return;
          if (Notification.permission !== "granted") return;

          const tag = data?.messageId ?? "yago-fcm";

          try {
            const n = new Notification(title, {
              body,
              icon: "/icons/icon-maskable-512.png",
              tag,
            });
            n.onclick = () => {
              window.focus();
              n.close();
              if (notificationId) {
                void recordNotificationClicked(notificationId);
              }
              const r = resolveFcmDeepLinkRoute(payload.data);
              goFcmTarget(r);
            };
          } catch {
            // 알림 생성 실패 시 무시 (브라우저 정책 등)
          }
        });
      } catch {
        // messaging 미지원
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  return null;
}
