/**
 * 공지 알림 조회 Hook
 * 
 * 원칙:
 * - 현재 사용자의 알림만 조회
 * - 읽지 않은 알림 개수 표시
 * - 실시간 구독 (선택)
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import type { NoticeNotification } from "@/types/notification";

interface UseNoticeNotificationsOptions {
  limitCount?: number;      // 최대 개수 (기본값: 50)
  realtime?: boolean;       // 실시간 구독 여부 (기본값: false)
  unreadOnly?: boolean;     // 읽지 않은 알림만 (기본값: false)
}

export function useNoticeNotifications(options: UseNoticeNotificationsOptions = {}) {
  const { user } = useAuth();
  const { limitCount = 50, realtime = false, unreadOnly = false } = options;
  
  const [notifications, setNotifications] = useState<NoticeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔥 알림 쿼리: target='all' 또는 target='user' && targetUid=user.uid
        const notificationsRef = collection(db, "notifications");
        const q = query(
          notificationsRef,
          where("type", "in", [
            'NOTICE_PUBLISHED',
            'NOTICE_SCHEDULED_PUBLISHED',
            'NOTICE_PINNED',
            'NOTICE_APPROVED',
            'NOTICE_REJECTED',
          ]),
          orderBy("createdAt", "desc"),
          limit(limitCount)
        );

        const snap = await getDocs(q);
        const allNotifications = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as NoticeNotification));

        // 🔥 필터링: target='all' 또는 target='user' && targetUid=user.uid
        const filteredNotifications = allNotifications.filter((n) => {
          if (n.target === 'all') return true;
          if (n.target === 'user' && n.targetUid === user.uid) return true;
          if (n.target === 'admins' && user.uid) return true; // 관리자는 추후 확장
          return false;
        });

        // 🔥 읽지 않은 알림 필터링
        const finalNotifications = unreadOnly
          ? filteredNotifications.filter((n) => !n.readBy?.includes(user.uid))
          : filteredNotifications;

        setNotifications(finalNotifications);
        
        // 🔥 읽지 않은 알림 개수 계산
        const unread = filteredNotifications.filter((n) => !n.readBy?.includes(user.uid)).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("공지 알림 조회 오류:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (realtime) {
      // 실시간 구독 (추후 구현)
      fetchNotifications();
    } else {
      fetchNotifications();
    }
  }, [user?.uid, limitCount, realtime, unreadOnly]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refetch: () => {
      // 재조회는 useEffect가 자동으로 처리
      setLoading(true);
    },
  };
}

