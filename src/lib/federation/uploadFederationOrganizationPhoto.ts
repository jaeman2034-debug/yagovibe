/**
 * 협회 조직 구성 임원 사진 — Storage 업로드 / 삭제
 * Path: federations/{federationId}/organization/{memberId}.jpg
 */
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { fileToFederationOrgPhotoBlob } from "@/lib/image/processFederationOrgPhoto";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export const FEDERATION_ORG_PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export function assertFederationOrgPhotoFile(file: File): void {
  const type = (file.type || "").toLowerCase();
  if (!ALLOWED.has(type)) {
    throw new Error("jpg, jpeg, png, webp 이미지만 올릴 수 있습니다.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("파일은 8MB 이하로 올려 주세요.");
  }
}

export function federationOrganizationPhotoPath(federationId: string, memberId: string): string {
  const safeId = String(memberId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 64);
  if (!safeId) throw new Error("memberId가 없습니다.");
  return `federations/${federationId}/organization/${safeId}.jpg`;
}

export async function uploadFederationOrganizationPhoto(opts: {
  federationId: string;
  memberId: string;
  /** 원본 파일(자동 중앙 크롭) 또는 이미 처리된 JPEG Blob */
  file?: File;
  blob?: Blob;
}): Promise<string> {
  if (!storage) throw new Error("Storage not initialized");

  let blob: Blob;
  if (opts.blob) {
    blob = opts.blob;
  } else if (opts.file) {
    assertFederationOrgPhotoFile(opts.file);
    blob = await fileToFederationOrgPhotoBlob(opts.file);
  } else {
    throw new Error("업로드할 이미지가 없습니다.");
  }

  const path = federationOrganizationPhotoPath(opts.federationId, opts.memberId);
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: "image/jpeg", cacheControl: "public,max-age=3600" });
  return getDownloadURL(r);
}

export async function deleteFederationOrganizationPhoto(opts: {
  federationId: string;
  memberId: string;
}): Promise<void> {
  if (!storage) return;
  const path = federationOrganizationPhotoPath(opts.federationId, opts.memberId);
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* 파일이 없어도 무시 */
  }
}
