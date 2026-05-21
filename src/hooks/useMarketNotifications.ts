/**
 * 🔔 매칭 알림 실시간 구독 훅
 * 
 * 사용법:
 * ```tsx
 * const { notifications, loading } = useMarketNotifications(userId);
 * ```
 */

import { useEffect, useState } from "react";
import type { DocumentData, QuerySnapshot } from "firebase/firestore";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface MarketNotification {
  id: string;
  type: "JOIN_APPROVED" | "JOIN_REJECTED_FULL" | "JOIN_REJECTED" | "JOIN_REQUESTED" | "USER_LEFT" | "WAITLIST_PROMOTED";
  title: string;
  body: string;
  postId: string;
  chatRoomId?: string;
  /** 있으면 라우팅 분기에 사용 (없으면 모집 매칭 알림으로 간주) */
  roomType?: string;
  read: boolean;
  createdAt: any; // Timestamp
}

/**
 * 매칭 알림 실시간 구독
 */
export function useMarketNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<MarketNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // 🔥 서브컬렉션 구조: notifications/{userId}/items
    const notificationsRef = collection(db, "notifications", userId, "items");
    const q = query(
      notificationsRef,
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items: MarketNotification[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MarketNotification[];

        setNotifications(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ [useMarketNotifications] 구독 실패:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { notifications, loading, error };
}
