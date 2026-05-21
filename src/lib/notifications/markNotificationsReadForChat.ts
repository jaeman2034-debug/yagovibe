/**
 * 채팅방 입장 시 해당 방 관련 미읽음 알림 일괄 읽음 처리
 * — `relatedChatId`가 저장된 문서만 대상 (신규 알림부터 적용)
 */

import { collection, getDocs, limit, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function markNotificationsReadForChat(userId: string, chatId: string): Promise<void> {
  if (!userId || !chatId) return;
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("relatedChatId", "==", chatId),
    where("isRead", "==", false),
    limit(50)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  for (const d of snap.docs) {
    batch.update(d.ref, { isRead: true });
  }
  await batch.commit();
}
