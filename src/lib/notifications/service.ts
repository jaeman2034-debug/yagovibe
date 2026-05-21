/**
 * 🔔 YAGO 알림 서비스 (제품 레벨)
 * 
 * 통합 서비스 레이어:
 * - 실시간 구독
 * - 읽음 처리
 * - 알림 생성
 */

import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification, NotificationType } from "@/types/notification";

/**
 * 알림 실시간 구독 (당근급)
 * 
 * @param userId 사용자 UID
 * @param callback 알림 목록 업데이트 콜백
 * @returns unsubscribe 함수
 */
export function subscribeNoti(
  userId: string,
  callback: (list: Notification[]) => void
): () => void {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("isRead", "==", false),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Notification[];
      callback(list);
    },
    (error) => {
      console.warn("⚠️ [subscribeNoti] 실시간 구독 실패:", error);
      callback([]); // 에러 시 빈 배열
    }
  );
}

/**
 * 알림 읽음 처리
 */
export async function markAsRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), {
    isRead: true,
  });
}

/**
 * 알림 생성 (서버 이벤트용)
 */
export async function createNoti(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  target?: Notification['target'];
  priority?: 'high' | 'normal' | 'low';
  payload?: Record<string, any>;
}): Promise<string> {
  const notificationRef = collection(db, "notifications");
  
  const notification: Omit<Notification, 'id'> = {
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.body,
    target: params.target,
    priority: params.priority || 'normal',
    isRead: false,
    createdAt: serverTimestamp(),
    ...(params.payload && { payload: params.payload }),
  };
  
  const docRef = await addDoc(notificationRef, notification);
  
  console.log(`✅ [createNoti] 알림 생성: ${docRef.id}`, {
    type: params.type,
    userId: params.userId,
  });
  
  return docRef.id;
}
