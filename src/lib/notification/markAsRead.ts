/**
 * 🔥 markNotificationAsRead - 알림 읽음 처리 (STEP: 알림 히스토리 & 활동 로그)
 * 
 * 알림 클릭 시 isRead = true
 */

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, {
    isRead: true,
  });
}
