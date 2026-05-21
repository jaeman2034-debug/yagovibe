/**
 * 거래 1:1 `chats/{chatId}/messages`용 이미지 전송 (chatRooms/sendMessageCommon 과 분리)
 */

import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadChatImage } from "./uploadChatImage";
import type { ChatImage } from "./sendMessageCommon";
import { mirrorTradeChatRoomLastMessage } from "./mirrorTradeChatRoomLastMessage";
import { notifyTradeChatRecipient } from "./notifyTradeChatRecipient";
import { fetchTradeThreadMemberIdsForChat } from "./tradeChatThreadMemberIds";

export async function sendChatsImageMessage(params: {
  chatId: string;
  uid: string;
  files: File[];
  otherUserId: string | null;
}): Promise<void> {
  const { chatId, uid, files, otherUserId } = params;
  if (files.length === 0) {
    throw new Error("업로드할 이미지가 없습니다.");
  }

  const uploadPromises = files.map((file) => uploadChatImage(file));
  const uploaded = await Promise.all(uploadPromises);
  const images: ChatImage[] = uploaded.map((img) => ({
    url: img.url,
    thumbUrl: img.thumbUrl,
    width: img.width,
    height: img.height,
  }));

  const lastPreview = images.length > 1 ? `사진 ${images.length}장` : "📷 사진";

  const tm = await fetchTradeThreadMemberIdsForChat(chatId);
  const msgRef = await addDoc(collection(db, "chats", chatId, "messages"), {
    type: "image",
    uid,
    senderId: uid,
    text: "사진을 보냈습니다",
    images,
    createdAt: serverTimestamp(),
    readBy: [uid],
    ...(tm ? { threadMemberIds: tm } : {}),
  });

  const chatRef = doc(db, "chats", chatId);
  const payload: Record<string, unknown> = {
    lastMessage: {
      text: lastPreview,
      senderId: uid,
      type: "image",
      createdAt: serverTimestamp(),
    },
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageSenderId: uid,
    lastMessageRead: false,
    [`unreadCount.${uid}`]: 0,
  };
  if (otherUserId) {
    payload[`unreadCount.${otherUserId}`] = increment(1);
  }
  await updateDoc(chatRef, payload);

  await mirrorTradeChatRoomLastMessage(chatId, {
    text: lastPreview,
    senderId: uid,
    type: "image",
  });

  void notifyTradeChatRecipient({
    recipientUserId: otherUserId,
    chatId,
    senderId: uid,
    previewText: lastPreview,
    messageDocId: msgRef.id,
  });
}
