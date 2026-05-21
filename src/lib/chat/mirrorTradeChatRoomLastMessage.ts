import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * `chats/{chatId}`만 갱신하면 목록의 `chatRooms/trade_*` 행은 예전 lastMessage에 머무는 경우가 있음.
 * 동일 거래 스레드의 trade 방 문서에 미러(미니멀: 미리보기·정렬용)만 갱신한다.
 */
export async function mirrorTradeChatRoomLastMessage(
  chatId: string,
  meta: { text: string; senderId: string; type: string }
): Promise<void> {
  try {
    const snap = await getDoc(doc(db, "chats", chatId));
    if (!snap.exists()) return;
    const d = snap.data() as Record<string, unknown>;
    const productId =
      (typeof d.postId === "string" && d.postId) ||
      (typeof (d.product as { id?: string } | undefined)?.id === "string" &&
        (d.product as { id: string }).id) ||
      (typeof d.listingId === "string" && d.listingId) ||
      "";
    const sellerId = typeof d.sellerId === "string" ? d.sellerId : "";
    const buyerId = typeof d.buyerId === "string" ? d.buyerId : "";
    if (!productId || !sellerId || !buyerId) return;

    const { buildChatRoomId } = await import("@/lib/chat/room");
    const tradeRoomId = buildChatRoomId({ productId, buyerId, sellerId });
    const ts = serverTimestamp();
    await updateDoc(doc(db, "chatRooms", tradeRoomId), {
      lastMessage: {
        text: meta.text,
        senderId: meta.senderId,
        type: meta.type,
        createdAt: ts,
      },
      lastMessageAt: ts,
      updatedAt: ts,
    });
  } catch {
    /* trade chatRooms 문서 없음·권한 불일치 등 — 무시 */
  }
}
