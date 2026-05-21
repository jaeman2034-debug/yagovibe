/**
 * 🔥 이미지 메시지 전송 함수
 * 
 * 역할:
 * - 여러 이미지 업로드
 * - sendMessageCommon 호출
 * - Trade/Recruit 공통
 */

import { uploadChatImage } from "./uploadChatImage";
import type { ChatImageResult } from "./uploadChatImage";
import { sendMessageCommon } from "./sendMessageCommon";

/**
 * 이미지 메시지 전송
 */
export async function sendImageMessage(
  roomId: string,
  uid: string,
  files: File[]
): Promise<void> {
  if (files.length === 0) {
    throw new Error("업로드할 이미지가 없습니다.");
  }

  try {
    // 🔥 모든 이미지 업로드
    const uploadPromises = files.map((file) => uploadChatImage(file));
    const images: ChatImageResult[] = await Promise.all(uploadPromises);

    // 🔥 메시지 전송
    await sendMessageCommon({
      roomId,
      uid,
      text: "사진을 보냈습니다",
      type: "image",
      images: images.map((img) => ({
        url: img.url,
        thumbUrl: img.thumbUrl,
        width: img.width,
        height: img.height,
      })),
    });
  } catch (error) {
    console.error("❌ [sendImageMessage] 이미지 메시지 전송 실패:", error);
    throw error;
  }
}
