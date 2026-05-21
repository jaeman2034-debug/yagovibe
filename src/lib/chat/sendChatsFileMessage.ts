/**
 * 거래 1:1 `chats/{chatId}/messages`용 일반 파일 전송 (이미지는 sendChatsImageMessage)
 */

import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { mirrorTradeChatRoomLastMessage } from "./mirrorTradeChatRoomLastMessage";
import { notifyTradeChatRecipient } from "./notifyTradeChatRecipient";
import { fetchTradeThreadMemberIdsForChat } from "./tradeChatThreadMemberIds";

export const CHATS_FILE_MAX_BYTES = 10 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "pif",
  "vbs",
  "js",
  "jar",
  "ps1",
  "sh",
  "app",
  "deb",
  "rpm",
]);

function extensionLower(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}

/** Storage 키용 — 경로 분리 문자 제거·길이 제한 */
function sanitizeStorageFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").trim() || "file";
  const safe = base.replace(/[^\w.\-()가-힣\s]/g, "_");
  return safe.slice(0, 180);
}

function truncatePreviewName(name: string, max = 48): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

export async function sendChatsFileMessage(params: {
  chatId: string;
  uid: string;
  file: File;
  otherUserId: string | null;
}): Promise<void> {
  const { chatId, uid, file, otherUserId } = params;
  if (!storage) {
    throw new Error("Firebase Storage가 초기화되지 않았습니다.");
  }
  if (!auth.currentUser) {
    throw new Error("인증된 사용자가 없습니다.");
  }

  if (file.size > CHATS_FILE_MAX_BYTES) {
    throw new Error("10MB 이하 파일만 보낼 수 있어요.");
  }

  const ext = extensionLower(file.name);
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error("보안상 이 형식은 보낼 수 없어요.");
  }

  const safeName = sanitizeStorageFileName(file.name);
  const objectPath = `chats/${chatId}/files/${Date.now()}_${uid}_${safeName}`;
  const storageRef = ref(storage, objectPath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
  });
  const fileUrl = await getDownloadURL(storageRef);

  const previewText = `📎 ${truncatePreviewName(file.name)}`;

  const tm = await fetchTradeThreadMemberIdsForChat(chatId);
  const msgRef = await addDoc(collection(db, "chats", chatId, "messages"), {
    type: "file",
    uid,
    senderId: uid,
    text: previewText,
    fileUrl,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || "application/octet-stream",
    createdAt: serverTimestamp(),
    readBy: [uid],
    ...(tm ? { threadMemberIds: tm } : {}),
  });

  const chatRef = doc(db, "chats", chatId);
  const payload: Record<string, unknown> = {
    lastMessage: {
      text: previewText,
      senderId: uid,
      type: "file",
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
    text: previewText,
    senderId: uid,
    type: "file",
  });

  void notifyTradeChatRecipient({
    recipientUserId: otherUserId,
    chatId,
    senderId: uid,
    previewText,
    messageDocId: msgRef.id,
  });
}
