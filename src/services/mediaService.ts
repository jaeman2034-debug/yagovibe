/**
 * 🔥 Media Service - 미디어 업로드/조회
 * 
 * 역할:
 * - Firebase Storage 업로드
 * - Firestore media 문서 생성
 * - 미디어 조회
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  getDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { storage, db } from "@/lib/firebase";
import { devError, devWarn } from "@/lib/utils/dev";
import { uploadTeamGalleryMediaCallable } from "@/lib/team/uploadTeamGalleryMediaClient";
import type { Media, MediaType, MediaEntityType } from "@/types/media";

/**
 * 미디어 업로드
 */
export async function uploadMedia(
  file: File,
  entityType: MediaEntityType,
  entityId: string,
  uploadedBy: string,
  options?: {
    title?: string;
    description?: string;
    tags?: string[];
  }
): Promise<Media> {
  try {
    // 파일 타입 확인
    const mediaType: MediaType = file.type.startsWith("video/")
      ? "video"
      : "photo";

    // Storage 경로 생성
    const storagePath = getStoragePath(entityType, entityId, mediaType, file.name);
    const storageRef = ref(storage, storagePath);

    // 업로드
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType:
        file.type ||
        (mediaType === "video" ? "video/mp4" : "image/jpeg"),
    });

    await uploadTask;

    // 다운로드 URL 가져오기
    const url = await getDownloadURL(storageRef);

    // Firestore 문서 생성
    const mediaData: Omit<Media, "id"> = {
      type: mediaType,
      entityType,
      entityId,
      url,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      title: options?.title,
      description: options?.description,
      tags: options?.tags || [],
      uploadedBy,
      status: mediaType === "photo" ? "ready" : "processing", // 비디오는 처리 필요
      createdAt: new Date() as any,
    };

    const docRef = await addDoc(collection(db, "media"), mediaData);

    // Cloud Function이 썸네일 생성하도록 트리거
    // (photo의 경우 즉시 ready, video는 processing 후 ready)

    return {
      id: docRef.id,
      ...mediaData,
    } as Media;
  } catch (error: any) {
    console.error("[uploadMedia] 업로드 실패:", error);
    throw error;
  }
}

/**
 * 업로드 진행률 추적
 */
export function uploadMediaWithProgress(
  file: File,
  entityType: MediaEntityType,
  entityId: string,
  uploadedBy: string,
  onProgress: (progress: number) => void,
  options?: {
    title?: string;
    description?: string;
    tags?: string[];
  }
): Promise<Media> {
  if (entityType === "team") {
    return uploadTeamGalleryMediaCallable(entityId, file, onProgress);
  }

  return new Promise((resolve, reject) => {
    const mediaType: MediaType = file.type.startsWith("video/")
      ? "video"
      : "photo";

    const storagePath = getStoragePath(entityType, entityId, mediaType, file.name);
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType:
        file.type ||
        (mediaType === "video" ? "video/mp4" : "image/jpeg"),
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error("[uploadMediaWithProgress] 업로드 실패:", error);
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(storageRef);

          const mediaData: Omit<Media, "id"> = {
            type: mediaType,
            entityType,
            entityId,
            url,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            title: options?.title,
            description: options?.description,
            tags: options?.tags || [],
            uploadedBy,
            status: mediaType === "photo" ? "ready" : "processing",
            createdAt: new Date() as any,
          };

          const docRef = await addDoc(collection(db, "media"), mediaData);

          resolve({
            id: docRef.id,
            ...mediaData,
          } as Media);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * 여러 파일 일괄 업로드
 */
export async function uploadMultipleMedia(
  files: File[],
  entityType: MediaEntityType,
  entityId: string,
  uploadedBy: string,
  onProgress?: (fileName: string, progress: number) => void
): Promise<Media[]> {
  const uploadPromises = files.map((file) =>
    uploadMediaWithProgress(
      file,
      entityType,
      entityId,
      uploadedBy,
      (progress) => {
        onProgress?.(file.name, progress);
      }
    )
  );

  return Promise.all(uploadPromises);
}

/**
 * 엔티티별 미디어 조회
 */
export async function getMediaByEntity(
  entityType: MediaEntityType,
  entityId: string,
  options?: {
    type?: MediaType;
    limitCount?: number;
  }
): Promise<Media[]> {
  try {
    let q = query(
      collection(db, "media"),
      where("entityType", "==", entityType),
      where("entityId", "==", entityId),
      orderBy("createdAt", "desc")
    );

    if (options?.type) {
      q = query(q, where("type", "==", options.type));
    }

    if (options?.limitCount) {
      q = query(q, limit(options.limitCount));
    }

    const snapshot = await getDocs(q);
    const media: Media[] = [];

    snapshot.forEach((doc) => {
      media.push({
        id: doc.id,
        ...doc.data(),
      } as Media);
    });

    return media;
  } catch (error: unknown) {
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      devWarn("[getMediaByEntity] 권한 없음(빈 목록으로 계속):", entityType, entityId);
    } else {
      devError("[getMediaByEntity] 조회 실패:", error);
    }
    return [];
  }
}

function storagePathFromFirebaseUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("firebasestorage.googleapis.com")) return null;
    const match = /\/o\/([^?]+)/.exec(u.pathname);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function deleteStorageByUrl(url: string): Promise<void> {
  const path = storagePathFromFirebaseUrl(url);
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* Storage 없어도 Firestore 정리는 진행 */
  }
}

/**
 * 미디어 메타데이터 수정 (제목·설명)
 */
export async function updateMediaMetadata(
  mediaId: string,
  patch: { title?: string; description?: string }
): Promise<void> {
  const mediaRef = doc(db, "media", mediaId);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description;
  await updateDoc(mediaRef, payload);
}

/**
 * 미디어 삭제
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  try {
    const mediaRef = doc(db, "media", mediaId);
    const mediaSnap = await getDoc(mediaRef);

    if (!mediaSnap.exists()) {
      throw new Error("미디어를 찾을 수 없습니다");
    }

    const mediaData = mediaSnap.data() as Media;

    await deleteStorageByUrl(mediaData.url);
    if (mediaData.thumbnailUrl) {
      await deleteStorageByUrl(mediaData.thumbnailUrl);
    }

    await deleteDoc(mediaRef);
  } catch (error) {
    console.error("[deleteMedia] 삭제 실패:", error);
    throw error;
  }
}

/**
 * 미디어 조회수 증가
 */
export async function incrementMediaViewCount(mediaId: string): Promise<void> {
  try {
    const mediaRef = doc(db, "media", mediaId);
    await updateDoc(mediaRef, {
      viewCount: increment(1),
    });
  } catch (error) {
    console.error("[incrementMediaViewCount] 실패:", error);
  }
}

/**
 * Storage 경로 생성
 */
function getStoragePath(
  entityType: MediaEntityType,
  entityId: string,
  mediaType: MediaType,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const extension = sanitizedFileName.split(".").pop();

  if (entityType === "match") {
    return `matches/${entityId}/${mediaType === "photo" ? "photos" : "videos"}/${timestamp}_${sanitizedFileName}`;
  }

  if (entityType === "team") {
    const folder = mediaType === "video" ? "videos" : "photos";
    return `teams/${entityId}/${folder}/${timestamp}_${sanitizedFileName}`;
  }

  if (entityType === "event") {
    return `events/${entityId}/gallery/${timestamp}_${sanitizedFileName}`;
  }

  if (entityType === "player") {
    return `players/${entityId}/photos/${timestamp}_${sanitizedFileName}`;
  }

  return `media/${entityType}/${entityId}/${timestamp}_${sanitizedFileName}`;
}
