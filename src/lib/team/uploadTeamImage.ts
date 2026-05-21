/**
 * 🔥 팀 이미지 업로드 유틸리티
 * 
 * Storage 경로: teams/{teamId}/profile.jpg
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

export interface UploadTeamImageResult {
  url: string;
  path: string;
}

/**
 * 팀 프로필 이미지 업로드
 */
export async function uploadTeamImage(
  file: File,
  teamId: string
): Promise<UploadTeamImageResult> {
  if (!storage) {
    throw new Error("Firebase Storage가 초기화되지 않았습니다.");
  }

  if (!auth.currentUser) {
    console.error("❌ [uploadTeamImage] 인증된 사용자가 없습니다.");
    console.error("🔍 [uploadTeamImage] auth.currentUser:", auth.currentUser);
    throw new Error("인증된 사용자가 없습니다.");
  }
  
  console.log("🔐 [uploadTeamImage] 인증 확인:", {
    uid: auth.currentUser.uid,
    email: auth.currentUser.email,
    isAnonymous: auth.currentUser.isAnonymous,
  });

  // 파일 확장자 추출
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const allowedExts = ["jpg", "jpeg", "png", "webp"];
  
  if (!allowedExts.includes(ext)) {
    throw new Error("지원하지 않는 이미지 형식입니다. (jpg, png, webp만 가능)");
  }

  // 파일 크기 체크 (5MB 제한)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("이미지 크기는 5MB 이하여야 합니다.");
  }

  // 🔥 Storage 경로: teams/{teamId}/{timestamp}.{ext} (캐시 문제 방지)
  const timestamp = Date.now();
  const storagePath = `teams/${teamId}/${timestamp}.${ext}`;
  const storageRef = ref(storage, storagePath);

  try {
    // 이미지 업로드
    console.log("📤 [uploadTeamImage] 업로드 시작:", {
      teamId,
      fileName: file.name,
      fileSize: file.size,
      storagePath,
    });

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      cacheControl: "public, max-age=31536000", // 1년 캐시
    });

    // 다운로드 URL 가져오기
    console.log("🔍 [uploadTeamImage] getDownloadURL 호출 시작...");
    const url = await getDownloadURL(snapshot.ref);
    
    console.log("=".repeat(80));
    console.log("✅ [uploadTeamImage] 업로드 완료!");
    console.log("=".repeat(80));
    console.log("📤 다운로드 URL:", url);
    console.log("📁 Storage 경로:", snapshot.ref.fullPath);
    console.log("🔗 URL 직접 열기:", url);
    console.log("=".repeat(80));

    return {
      url,
      path: snapshot.ref.fullPath,
    };
  } catch (error: any) {
    console.error("❌ [uploadTeamImage] 업로드 실패:", error);
    throw new Error(`이미지 업로드에 실패했습니다: ${error.message}`);
  }
}

/**
 * 이미지 압축 (선택사항, 나중에 추가 가능)
 */
export async function compressTeamImage(file: File): Promise<File> {
  // TODO: 이미지 압축 로직 추가 (필요 시)
  return file;
}
