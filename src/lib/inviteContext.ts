/**
 * 🔥 QR 초대 inviteId 유지/복구 유틸 (v1 LOCK)
 * 
 * 핵심:
 * - /qr?invite=xxx로 들어오면 query에서 invite 획득 → localStorage 저장
 * - query가 없어도 localStorage에서 복구
 * - join 성공/실패 시 localStorage 정리
 */

const KEY = "pendingInviteId_v1";

/**
 * URL에서 invite 파라미터를 추출하고 localStorage에 저장
 */
export function captureInviteFromUrl(): string | null {
  const url = new URL(window.location.href);
  const invite = url.searchParams.get("invite")?.trim() || null;
  
  if (invite) {
    localStorage.setItem(KEY, invite);
  }
  
  return invite;
}

/**
 * localStorage에서 대기 중인 inviteId 조회
 */
export function getPendingInvite(): string | null {
  return localStorage.getItem(KEY);
}

/**
 * localStorage에서 대기 중인 inviteId 제거
 */
export function clearPendingInvite(): void {
  localStorage.removeItem(KEY);
}

