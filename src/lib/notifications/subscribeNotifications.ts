/**
 * 🔔 알림 실시간 구독 (YAGO 알림 시스템)
 * 
 * 당근급 실시간 업데이트
 */

import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification } from "@/types/notification";

/**
 * 알림 실시간 구독
 * 
 * @param userId 사용자 UID
 * @param callback 알림 목록 업데이트 콜백
 * @returns unsubscribe 함수
 */
export function subscribeNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("isRead", "==", false),
    orderBy("createdAt", "desc"),
    limit(50) // 최대 50개
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      callback(notifications);
    },
    (error) => {
      console.warn("⚠️ [subscribeNotifications] 실시간 구독 실패:", error);
      callback([]); // 에러 시 빈 배열
    }
  );

  return unsubscribe;
}
