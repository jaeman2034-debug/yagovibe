/**
 * 미읽음 플랫폼 알림 개수 — `getCountFromServer` 단일 소스 (전체 정확 개수)
 *
 * `notifications`에 대한 두 번째 `onSnapshot`은 Firestore JS SDK와 StrictMode 조합에서
 * 내부 단언(b815)을 유발할 수 있어, 실시간 감지는 `usePlatformNotifications` 한 곳에만 둡니다.
 * 이 훅은 레거시 벨 등에서만 쓰이며 폴링·탭 포커스로 갱신합니다.
 */

import { useState, useEffect } from "react";
import { getCountFromServer } from "firebase/firestore";
import { unreadNotificationsQuery } from "@/lib/notifications/queries";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";

const POLL_INTERVAL_MS = 30_000;

export function useUnreadNotificationCount() {
  const { user, canQuery } = useAuthForFirestore();
  const enabled = canQuery;
  const uid = user?.uid;

  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !uid) {
      setCount(0);
      setLoading(false);
      return;
    }

    const q = unreadNotificationsQuery(uid);
    let cancelled = false;

    const refresh = () => {
      if (cancelled) return;
      void getCountFromServer(q)
        .then((snap) => {
          if (cancelled) return;
          setCount(snap.data().count);
        })
        .catch(() => {
          if (cancelled) return;
          setCount(0);
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
    };

    refresh();

    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, uid]);

  return {
    count,
    loading,
    error: null as Error | null,
  };
}
