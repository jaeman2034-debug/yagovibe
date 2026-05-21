/**
 * 🔥 동영상 메시지 전송 함수
 * 
 * 역할:
 * - 여러 동영상 업로드
 * - sendMessageCommon 호출
 * - Trade/Recruit 공통
 */

import { uploadChatVideo } from "./uploadChatVideo";
import type { ChatVideoResult } from "./uploadChatVideo";
import { sendMessageCommon } from "./sendMessageCommon";

/**
 * 동영상 메시지 전송
 */
export async function sendVideoMessage(
  roomId: string,
  uid: string,
  files: File[]
): Promise<void> {
  if (files.length === 0) {
    throw new Error("업로드할 동영상이 없습니다.");
  }

  try {
    // 🔥 모든 동영상 업로드
    const uploadPromises = files.map((file) => uploadChatVideo(file));
    const videos: ChatVideoResult[] = await Promise.all(uploadPromises);

    // 🔥 메시지 전송
    await sendMessageCommon({
      roomId,
      uid,
      text: "동영상을 보냈습니다",
      type: "video",
      videos: videos.map((vid) => ({
        url: vid.url,
        thumbUrl: vid.thumbUrl,
        duration: vid.duration,
        size: vid.size,
      })),
    });
  } catch (error) {
    console.error("❌ [sendVideoMessage] 동영상 메시지 전송 실패:", error);
    throw error;
  }
}
