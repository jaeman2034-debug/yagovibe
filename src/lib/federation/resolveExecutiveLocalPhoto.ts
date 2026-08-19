/**
 * 임원 로컬 사진 자동 매핑
 *
 * 우선순위:
 * 1) Firestore remote (CMS Storage URL)
 * 2) Nowon PHOTO_MAP (실제 한글 파일명)
 * 3) Avatar (카드 onError)
 */

import {
  EXECUTIVE_PHOTOS_BASE as PHOTO_BASE,
  resolveNowonExecutivePhotoByName,
} from "@/lib/federation/nowonExecutivePhotoMap";

export const EXECUTIVE_PHOTOS_BASE = PHOTO_BASE;

/**
 * Firestore remote URL 여부 (로컬 정적 경로와 구분)
 */
export function isRemoteExecutivePhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith(EXECUTIVE_PHOTOS_BASE)) return false;
  if (u.startsWith("/images/executives/")) return false;
  return /^https?:\/\//i.test(u) || u.startsWith("gs://") || u.includes("firebasestorage");
}

/**
 * 사진 소스 목록
 * Firestore(remote) → PHOTO_MAP → (없으면 빈 배열 → Avatar)
 */
export function resolveExecutivePhotoSources(input: {
  position: string;
  name: string;
  firestorePhoto?: string | null;
}): string[] {
  const out: string[] = [];
  const remote = input.firestorePhoto?.trim();

  if (remote && isRemoteExecutivePhoto(remote)) {
    out.push(remote);
  } else if (remote && remote.startsWith("/")) {
    // 이미 로컬/상대 경로로 저장된 경우
    out.push(remote);
  }

  const mapped = resolveNowonExecutivePhotoByName(input.name);
  if (mapped && !out.includes(mapped)) {
    out.push(mapped);
  }

  return out;
}

/** @deprecated 레거시 — PHOTO_MAP으로 대체. 호출부 호환용 no-op */
export function buildExecutivePhotoStems(_position: string, _name: string): string[] {
  return [];
}

/** @deprecated 레거시 — PHOTO_MAP으로 대체 */
export function resolveLocalExecutivePhotoCandidates(_position: string, _name: string): string[] {
  return [];
}
