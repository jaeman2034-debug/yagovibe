/**
 * 🔔 usePlatformNotifications - 플랫폼 스포츠 알림 훅
 *
 * 역할:
 * - 실시간 알림 구독
 * - 읽지 않은 알림 개수(로드된 최신 N개 기준)
 * - 최신 알림 목록
 *
 * 이전에는 `getCountFromServer` + `onSnapshot` 병행 시 Firestore JS SDK 내부 단언(b815)이
 * 났을 수 있어, 미읽음 수는 목록 쿼리 결과에서만 계산합니다(쿼리 limit 이내).
 */

import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  updateDoc,
  doc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";
import type { Notification } from "@/types/notification";

interface UsePlatformNotificationsOptions {
  limitCount?: number; // 기본값: 10
  unreadOnly?: boolean; // 읽지 않은 것만
}

export function usePlatformNotifications(options?: UsePlatformNotificationsOptions) {
  const { user, canQuery } = useAuthForFirestore();
  const limitCount = options?.limitCount || 10;
  const unreadOnly = options?.unreadOnly || false;

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  /** effect cleanup 이후 콜백에서 setState 금지 */
  const subscribeGenRef = useRef(0);

  useEffect(() => {
    if (!canQuery || !user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const gen = ++subscribeGenRef.current;
    const uid = user.uid;
    const notificationsRef = collection(db, "notifications");
    const listConstraints: Parameters<typeof query>[1][] = [
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ];
    const qList = query(notificationsRef, ...listConstraints);

    const unsubList = onSnapshot(
      qList,
      (snap) => {
        if (gen !== subscribeGenRef.current) return;
        try {
          const notificationsData = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Notification[];

          const filtered = unreadOnly
            ? notificationsData.filter((n) => !n.isRead)
            : notificationsData;

          setNotifications(filtered);
          const unreadFromLoaded = unreadOnly
            ? filtered.length
            : notificationsData.filter((n) => !n.isRead).length;
          setUnreadCount(unreadFromLoaded);
        } catch (err) {
          console.warn("[usePlatformNotifications] 알림 목록 실패:", err);
          setNotifications([]);
          setUnreadCount(0);
        } finally {
          if (gen === subscribeGenRef.current) {
            setLoading(false);
          }
        }
      },
      (error) => {
        if (gen !== subscribeGenRef.current) return;
        console.warn("[usePlatformNotifications] 목록 구독 실패:", error);
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
      }
    );

    return () => {
      unsubList();
    };
  }, [canQuery, user?.uid, limitCount, unreadOnly]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        isRead: true,
      });
    } catch (error) {
      console.error("[usePlatformNotifications] 읽음 처리 실패:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid) return;

    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("isRead", "==", false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((d) => {
        batch.update(d.ref, { isRead: true });
      });

      await batch.commit();
    } catch (error) {
      console.error("[usePlatformNotifications] 전체 읽음 처리 실패:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
