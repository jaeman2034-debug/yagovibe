/**
 * 🔥 채팅 동영상 업로드 유틸리티
 * 
 * 역할:
 * - 동영상 업로드
 * - 썸네일 추출 (1프레임)
 * - Trade/Recruit 공통
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

export interface ChatVideoResult {
  url: string;
  thumbUrl: string;
  duration: number;
  size: number;
}

/**
 * 동영상 썸네일 추출 (1프레임)
 */
function createVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // 첫 프레임으로 이동
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 200;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context를 가져올 수 없습니다."));
          return;
        }

        // 비율 유지하며 리사이즈
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth = canvas.width;
        let drawHeight = canvas.height;
        let offsetX = 0;
        let offsetY = 0;

        if (videoAspect > canvasAspect) {
          // 비디오가 더 넓음
          drawHeight = canvas.width / videoAspect;
          offsetY = (canvas.height - drawHeight) / 2;
        } else {
          // 비디오가 더 높음
          drawWidth = canvas.height * videoAspect;
          offsetX = (canvas.width - drawWidth) / 2;
        }

        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        const thumbDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        URL.revokeObjectURL(video.src);
        resolve(thumbDataUrl);
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("동영상 로드 실패"));
    };

    // 타임아웃 (10초)
    setTimeout(() => {
      if (video.readyState < 2) {
        URL.revokeObjectURL(video.src);
        reject(new Error("동영상 로드 타임아웃"));
      }
    }, 10000);
  });
}

/**
 * 동영상 길이 가져오기
 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(video.src);
      resolve(duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("동영상 메타데이터 로드 실패"));
    };

    // 타임아웃 (10초)
    setTimeout(() => {
      URL.revokeObjectURL(video.src);
      reject(new Error("동영상 메타데이터 로드 타임아웃"));
    }, 10000);
  });
}

/**
 * 썸네일을 Firebase Storage에 업로드
 */
async function uploadThumbnail(thumbDataUrl: string, fileId: string): Promise<string> {
  if (!storage) {
    throw new Error("Firebase Storage가 초기화되지 않았습니다.");
  }

  // Data URL을 Blob으로 변환
  const response = await fetch(thumbDataUrl);
  const blob = await response.blob();

  const thumbRef = ref(storage, `chat/video/thumb/${fileId}`);
  await uploadBytes(thumbRef, blob);
  return await getDownloadURL(thumbRef);
}

/**
 * 채팅 동영상 업로드 (썸네일 포함)
 */
export async function uploadChatVideo(file: File): Promise<ChatVideoResult> {
  if (!storage) {
    throw new Error("Firebase Storage가 초기화되지 않았습니다.");
  }

  if (!auth.currentUser) {
    throw new Error("인증된 사용자가 없습니다.");
  }

  // 🔥 용량 제한 체크 (30MB)
  const maxSize = 30 * 1024 * 1024; // 30MB
  if (file.size > maxSize) {
    throw new Error(`동영상 크기는 ${maxSize / 1024 / 1024}MB 이하여야 합니다.`);
  }

  const uid = auth.currentUser.uid;
  const timestamp = Date.now();
  const fileId = `${timestamp}-${uid}`;

  try {
    // 🔥 1. 동영상 길이 가져오기
    const duration = await getVideoDuration(file);

    // 🔥 2. 썸네일 추출
    const thumbDataUrl = await createVideoThumbnail(file);

    // 🔥 3. 썸네일 업로드
    const thumbUrl = await uploadThumbnail(thumbDataUrl, fileId);

    // 🔥 4. 동영상 업로드
    const videoRef = ref(storage, `chat/video/${fileId}`);
    await uploadBytes(videoRef, file);
    const url = await getDownloadURL(videoRef);

    return {
      url,
      thumbUrl,
      duration,
      size: file.size,
    };
  } catch (error) {
    console.error("❌ [uploadChatVideo] 동영상 업로드 실패:", error);
    throw error;
  }
}
