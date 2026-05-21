/**
 * 🔥 공지 기반 대화 Repository
 * Step 3: 클라이언트 Repository 함수 (실전 구현)
 */

import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  NoticeConversation,
  ConversationMessage,
} from "@/types/noticeConversation";

/**
 * 대화 스레드 조회
 * conversationId = noticeId (1:1 매핑)
 */
export async function getConversation(
  associationId: string,
  noticeId: string
): Promise<NoticeConversation | null> {
  const convoRef = doc(
    db,
    `associations/${associationId}/noticeConversations/${noticeId}`
  );
  const convoSnap = await getDoc(convoRef);

  if (!convoSnap.exists()) {
    return null;
  }

  return {
    id: convoSnap.id,
    ...convoSnap.data(),
  } as NoticeConversation;
}

/**
 * 🔥 실시간 메시지 구독
 * 대화방 진입 시 호출
 */
export function subscribeNoticeChat(
  associationId: string,
  noticeId: string,
  onChange: (messages: ConversationMessage[]) => void
): () => void {
  const messagesRef = collection(
    db,
    `associations/${associationId}/noticeConversations/${noticeId}/messages`
  );
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({
      id: d.id,
      conversationId: noticeId,
      ...d.data(),
    })) as ConversationMessage[];

    // createdAt 기준 정렬 (Timestamp 변환)
    list.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || 0;
      return aTime - bTime;
    });

    onChange(list);
  });
}

/**
 * 🔥 메시지 전송
 */
export async function sendNoticeMessage(params: {
  associationId: string;
  noticeId: string;
  senderType: "USER" | "ADMIN";
  senderId: string;
  senderName?: string;
  content: string;
}): Promise<string> {
  const messagesRef = collection(
    db,
    `associations/${params.associationId}/noticeConversations/${params.noticeId}/messages`
  );

  const messageRef = await addDoc(messagesRef, {
    senderType: params.senderType,
    senderId: params.senderId,
    senderName: params.senderName,
    content: params.content,
    createdAt: serverTimestamp(),
  });

  // 대화 스레드의 lastMessageAt 업데이트
  const convoRef = doc(
    db,
    `associations/${params.associationId}/noticeConversations/${params.noticeId}`
  );
  await setDoc(
    convoRef,
    {
      lastMessageAt: serverTimestamp(),
    },
    { merge: true }
  );

  return messageRef.id;
}

