/**
 * 🔥 useNotificationsRealtime - 실시간 알림 구독 훅
 *
 * 역할:
 * - notifications 컬렉션 실시간 구독
 * - 읽지 않은 알림만 필터링(옵션)
 * - 최신 N개만 조회
 *
 * 전체 미읽음 개수는 `usePlatformNotifications`가 목록 스냅샷(최근 N건)에서 계산합니다.
 */

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";
import type { Notification } from "@/types/notification";

interface UseNotificationsRealtimeOptions {
  enabled?: boolean;
  limitCount?: number; // 기본값: 10
  unreadOnly?: boolean; // 읽지 않은 것만
}

export function useNotificationsRealtime(options?: UseNotificationsRealtimeOptions) {
  const { user, canQuery } = useAuthForFirestore();
  const enabled = options?.enabled !== false && canQuery;
  const limitCount = options?.limitCount || 10;
  const unreadOnly = options?.unreadOnly || false;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const notificationsRef = collection(db, "notifications");
    const constraints: any[] = [
      where("userId", "==", user!.uid),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ];

    const q = query(notificationsRef, ...constraints);

    const unsubscribe = onSnapshot(q, (snap) => {
      try {
        const notificationsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        // 읽지 않은 것만 필터링 (옵션)
        const filtered = unreadOnly
          ? notificationsData.filter((n) => !n.isRead)
          : notificationsData;

        setNotifications(filtered);
      } catch (err) {
        console.warn("[useNotificationsRealtime] 알림 조회 실패:", err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.warn("[useNotificationsRealtime] 구독 실패:", error);
      setNotifications([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled, canQuery, user?.uid, limitCount, unreadOnly]);

  return {
    notifications,
    loading,
  };
}
