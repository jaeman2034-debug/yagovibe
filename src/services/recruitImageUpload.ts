import imageCompression from "browser-image-compression";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

async function compressImage(file: File): Promise<File> {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    });
    return compressed as File;
  } catch {
    return file;
  }
}

/**
 * 팀원 모집 글용 이미지 업로드 (경로: recruitImages/{uid}/...)
 */
export async function uploadRecruitImages(uid: string, files: File[]): Promise<string[]> {
  if (files.length === 0) return [];

  const urls: string[] = [];
  const base = Date.now();

  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i]);
    const ext = compressed.name?.includes(".")
      ? compressed.name.split(".").pop() || "jpg"
      : "jpg";
    const path = `recruitImages/${uid}/${base}-${i}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, compressed, {
      contentType: compressed.type || "image/jpeg",
    });
    urls.push(await getDownloadURL(storageRef));
  }

  return urls;
}
