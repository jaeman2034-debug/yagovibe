/**
 * 🔔 YAGO 알림 훅 (제품 레벨)
 * 
 * React 훅 모음:
 * - useNotifications: 알림 목록
 * - useUnreadCount: 배지 카운트
 */

import { useState, useEffect } from "react";
import { subscribeNoti } from "./service";
import type { Notification } from "@/types/notification";
import { useAuth } from "@/context/AuthProvider";

/**
 * 알림 목록 훅 (실시간)
 */
export function useNotifications() {
  const { user } = useAuth();
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setList([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeNoti(user.uid, (notifications) => {
      setList(notifications);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  return { list, loading };
}

/**
 * 미읽음 개수 훅 (배지용)
 */
export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setCount(0);
      return;
    }

    const unsubscribe = subscribeNoti(user.uid, (notifications) => {
      setCount(notifications.length);
    });

    return unsubscribe;
  }, [user?.uid]);

  return count;
}
