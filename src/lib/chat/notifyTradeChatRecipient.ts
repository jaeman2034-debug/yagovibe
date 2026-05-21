/**
 * 거래 1:1 `chats/{chatId}` — 상대에게 플랫폼 알림(notifications) 생성
 * (헤더 벨 /notifications 구독과 동일 스키마: userId, message, isRead, target …)
 *
 * 동일 메시지 문서에 대해 클라이언트에서 이중 호출되면(더블 탭 등) 알림 1회만 — `notificationGuard` + messageDocId
 */

import { shouldNotify } from "@/lib/chat/notificationGuard";
import { createNotification } from "@/lib/notifications/createNotification";

export async function notifyTradeChatRecipient(params: {
  recipientUserId: string | null | undefined;
  chatId: string;
  senderId: string;
  previewText: string;
  messageDocId?: string;
}): Promise<void> {
  const { recipientUserId, chatId, senderId, previewText, messageDocId } = params;
  if (!recipientUserId || recipientUserId === senderId) return;
  if (messageDocId) {
    const dedupeKey = `trade_${chatId}_${messageDocId}`;
    if (!shouldNotify(dedupeKey)) return;
  }
  const message = (previewText.trim() || "새 메시지가 도착했어요.").slice(0, 200);
  try {
    await createNotification({
      userId: recipientUserId,
      type: "MARKET_CHAT_MESSAGE",
      title: "거래 채팅",
      message,
      target: { screen: "chat", id: chatId },
      priority: "high",
      actorId: senderId,
      relatedChatId: chatId,
      payload: {
        chatRoomId: chatId,
        senderId,
        messageId: messageDocId,
        roomType: "trade",
        preview: message,
      },
    });
  } catch (e) {
    console.warn("[notifyTradeChatRecipient] 알림 생성 실패(메시지는 전달됨):", e);
  }
}
