/**
 * 🔔 YAGO 알림 서비스 (Firestore 레이어)
 */

import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { YagoNoti } from "./types";

/**
 * 실시간 구독 (안읽음 기준)
 */
export function subscribeNoti(
  uid: string,
  cb: (list: YagoNoti[]) => void
): () => void {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", uid),
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
      })) as YagoNoti[];

      cb(list);
    },
    (error) => {
      console.warn("⚠️ [subscribeNoti] 실시간 구독 실패:", error);
      cb([]); // 에러 시 빈 배열
    }
  );
}

/**
 * 읽음 처리
 */
export async function markAsRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), {
    isRead: true,
  });
}

/**
 * 채팅 알림 생성 (서버 대용)
 */
/**
 * 🔥 P1-3: 채팅 알림 생성 (스팸 방지 + roomType 분리)
 */
export async function createChatNoti(
  toUid: string,
  roomId: string,
  text: string,
  messageId?: string, // 🔥 메시지 ID (스팸 방지용)
  roomType?: "trade" | "recruit_group" // 🔥 P1-3: 방 타입 (payload 분리용)
): Promise<string | null> {
  // 🔥 알림 스팸 방지: 같은 메시지 중복 알림 차단
  if (messageId) {
    const { shouldNotify } = await import("@/lib/chat/notificationGuard");
    if (!shouldNotify(messageId)) {
      console.log(`⚠️ [createChatNoti] 중복 알림 차단: ${messageId}`);
      return null;
    }
  }

  // 🔥 P1-3: roomType에 따라 알림 내용 분기
  const title = roomType === "recruit_group" ? "모집 단체방 새 메시지" : "새 메시지";
  const priority = roomType === "recruit_group" ? "normal" : "high"; // 그룹은 우선순위 낮춤

  const preview = text.slice(0, 200);
  const docRef = await addDoc(collection(db, "notifications"), {
    userId: toUid,
    type: "CHAT_MESSAGE",
    title,
    message: preview,
    body: preview,
    target: { screen: "chat", id: roomId },
    isRead: false,
    createdAt: serverTimestamp(),
    priority,
    messageId,
    relatedChatId: roomId,
    payload: {
      roomId,
      roomType: roomType || "trade",
      preview,
      ...(messageId ? { messageId } : {}),
    },
  });

  console.log(`✅ [createChatNoti] 알림 생성: ${docRef.id} (to ${toUid}, messageId: ${messageId || "N/A"}, roomType: ${roomType || "trade"})`);
  return docRef.id;
}

/**
 * 거래 알림 생성 (가격 제안)
 */
export async function createPriceOfferNoti(
  toUid: string,
  productId: string,
  price: number
): Promise<string> {
  const docRef = await addDoc(collection(db, "notifications"), {
    userId: toUid,
    type: "PRICE_OFFER",
    title: "가격 제안",
    body: `${price.toLocaleString()}원에 제안이 들어왔어요`,
    target: { screen: "item", id: productId },
    isRead: false,
    createdAt: serverTimestamp(),
    priority: "high",
  });

  return docRef.id;
}

/**
 * 거래 상태 알림 생성 (예약/완료)
 */
export async function createTradeStatusNoti(
  toUid: string,
  productId: string,
  status: "TRADE_RESERVED" | "TRADE_COMPLETED"
): Promise<string> {
  const statusText = status === "TRADE_RESERVED" ? "예약됨" : "거래완료";
  const docRef = await addDoc(collection(db, "notifications"), {
    userId: toUid,
    type: status,
    title: statusText,
    body: status === "TRADE_RESERVED" 
      ? "거래가 예약되었어요 📅" 
      : "거래가 완료되었어요 🎉",
    target: { screen: "trade", id: productId },
    isRead: false,
    createdAt: serverTimestamp(),
    priority: "normal",
  });

  return docRef.id;
}

/**
 * 🔥 모집 단체방 알림 생성
 */
export async function createRecruitNoti(
  toUid: string,
  roomId: string,
  postId: string,
  type: "RECRUIT_NEW_MEMBER" | "RECRUIT_KICKED" | "RECRUIT_CLOSED",
  text: string
): Promise<string> {
  const titleMap = {
    RECRUIT_NEW_MEMBER: "새 멤버 입장",
    RECRUIT_KICKED: "강퇴됨",
    RECRUIT_CLOSED: "모집 마감",
  };

  const docRef = await addDoc(collection(db, "notifications"), {
    userId: toUid,
    type,
    title: titleMap[type],
    body: text,
    target: { screen: "chat", id: roomId },
    payload: {
      postId,
      roomId,
    },
    isRead: false,
    createdAt: serverTimestamp(),
    priority: type === "RECRUIT_KICKED" ? "high" : "normal",
  });

  console.log(`✅ [createRecruitNoti] 알림 생성: ${docRef.id} (to ${toUid}, type: ${type})`);
  return docRef.id;
}
