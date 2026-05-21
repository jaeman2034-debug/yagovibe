/**
 * 🔥 채팅 이미지 업로드 유틸리티
 * 
 * 역할:
 * - 썸네일 + 원본 압축
 * - Firebase Storage 업로드
 * - Trade/Recruit 공통
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { enableNetwork } from "firebase/firestore";
import { storage, auth, db } from "@/lib/firebase";

export interface ChatImageResult {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

/**
 * 이미지 압축 (간단한 리사이즈)
 */
async function compressImage(file: File, maxWidthOrHeight: number, maxSizeMB: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // 비율 유지하며 리사이즈
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = (height * maxWidthOrHeight) / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = (width * maxWidthOrHeight) / height;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context를 가져올 수 없습니다."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("이미지 압축 실패"));
              return;
            }
            // 크기 체크 (MB 단위)
            if (blob.size > maxSizeMB * 1024 * 1024) {
              // 더 강하게 압축
              canvas.toBlob(
                (compressedBlob) => {
                  if (!compressedBlob) {
                    reject(new Error("이미지 압축 실패"));
                    return;
                  }
                  resolve(compressedBlob);
                },
                "image/jpeg",
                0.7
              );
            } else {
              resolve(blob);
            }
          },
          "image/jpeg",
          0.9
        );
      };
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 크기 가져오기
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error("이미지 크기 확인 실패"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

/** Google Cloud 브라우저 API 키에 Token Service 등이 막혀 있을 때 Firebase가 던지는 메시지 */
function isSecureTokenGrantBlocked(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code || "";
  return (
    code.includes("auth/requests-to-this-api") ||
    msg.includes("GrantToken-are-blocked") ||
    msg.includes("securetoken.googleapis.com")
  );
}

function secureTokenBlockedUserMessage(): Error {
  return new Error(
    "Firebase 인증 토큰 API가 차단되어 있습니다. Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → " +
      "이 앱의 웹 API 키 → API 제한에서 「Token Service API」「Identity Toolkit API」를 허용하거나, " +
      "개발 중에는 API 제한을 잠시 해제한 뒤 다시 시도해 주세요."
  );
}

/**
 * 채팅 이미지 업로드 (썸네일 + 원본)
 */
export async function uploadChatImage(file: File): Promise<ChatImageResult> {
  if (!storage) {
    throw new Error("Firebase Storage가 초기화되지 않았습니다.");
  }

  if (!auth.currentUser) {
    throw new Error("인증된 사용자가 없습니다.");
  }

  const uid = auth.currentUser.uid;
  const timestamp = Date.now();
  const fileId = `${timestamp}-${uid}`;

  try {
    try {
      await enableNetwork(db);
    } catch {
      /* ignore */
    }
    // getIdToken(true)는 매 요청마다 securetoken.googleapis.com(GrantToken)을 호출함.
    // GCP에서 해당 API가 API 키 제한으로 막혀 있으면 업로드 전에 항상 실패하므로 호출하지 않음.

    // 🔥 원본 이미지 크기 확인
    const { width, height } = await getImageDimensions(file);

    // 🔥 1. 썸네일 압축 (300px, 0.2MB)
    const thumbBlob = await compressImage(file, 300, 0.2);
    const thumbRef = ref(storage, `chat/thumb/${fileId}`);
    const thumbCt =
      thumbBlob.type && thumbBlob.type.startsWith("image/") ? thumbBlob.type : "image/jpeg";
    await uploadBytes(thumbRef, thumbBlob, { contentType: thumbCt });

    const thumbUrl = await getDownloadURL(thumbRef);

    // 🔥 2. 원본 압축 (1280px, 1MB)
    const originBlob = await compressImage(file, 1280, 1);
    const originRef = ref(storage, `chat/origin/${fileId}`);
    const originCt =
      originBlob.type && originBlob.type.startsWith("image/") ? originBlob.type : "image/jpeg";
    await uploadBytes(originRef, originBlob, { contentType: originCt });
    const url = await getDownloadURL(originRef);

    return {
      url,
      thumbUrl,
      width,
      height,
    };
  } catch (error: unknown) {
    console.error("❌ [uploadChatImage] 이미지 업로드 실패:", error);
    if (isSecureTokenGrantBlocked(error)) {
      throw secureTokenBlockedUserMessage();
    }
    const code = (error as { code?: string })?.code || "";
    const msg = error instanceof Error ? error.message : String(error);
    if (code === "storage/unauthorized") {
      throw new Error("업로드 권한이 없습니다. 다시 로그인한 뒤 시도해 주세요.");
    }
    if (msg.includes("offline") || code === "unavailable") {
      throw new Error(
        "오프라인 상태이거나 서버에 연결할 수 없습니다. 네트워크와 로그인 상태를 확인해 주세요."
      );
    }
    if (msg.includes("로그인") || msg.includes("네트워크") || msg.includes("API 키") || msg.includes("Token Service")) {
      throw error instanceof Error ? error : new Error(msg);
    }
    throw error instanceof Error ? error : new Error("이미지 업로드에 실패했습니다.");
  }
}
