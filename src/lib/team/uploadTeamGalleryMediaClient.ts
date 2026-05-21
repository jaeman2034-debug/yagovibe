import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { Media } from "@/types/media";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

export type UploadTeamGalleryMediaResult = {
  ok: boolean;
  media: Media;
};

/**
 * 팀 갤러리 미디어 — 서버(Admin SDK) 업로드.
 * Storage rules / members SoT 불일치 시에도 팀장·운영진 업로드 가능.
 */
export async function uploadTeamGalleryMediaCallable(
  teamId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<Media> {
  onProgress?.(10);
  const fileDataUrl = await fileToDataUrl(file);
  onProgress?.(40);

  const callable = httpsCallable<
    {
      teamId: string;
      fileDataUrl: string;
      fileName: string;
      mimeType: string;
      mediaType?: "photo" | "video";
    },
    UploadTeamGalleryMediaResult
  >(functions, "uploadTeamGalleryMedia");

  const mediaType = file.type.startsWith("video/") ? "video" : "photo";
  const result = await callable({
    teamId: teamId.trim(),
    fileDataUrl,
    fileName: file.name,
    mimeType: file.type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
    mediaType,
  });

  onProgress?.(100);
  return {
    ...result.data.media,
    createdAt: result.data.media.createdAt ?? new Date(),
  } as Media;
}
