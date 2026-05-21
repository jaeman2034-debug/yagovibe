/**
 * 🔥 Story Expiration Policy - 노출 기간 정책
 * 
 * 정책: 관리자가 지정 (기본값 7일)
 */

// 기본 만료 기간 (초)
export const DEFAULT_EXPIRATION_DAYS = 7;
export const DEFAULT_EXPIRATION_SECONDS = DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60;

// 최소/최대 만료 기간 제한
export const MIN_EXPIRATION_DAYS = 1;
export const MAX_EXPIRATION_DAYS = 90; // 최대 90일

/**
 * 만료 시간 계산
 * 
 * @param customDays - 관리자가 지정한 일수 (없으면 기본값 7일)
 * @returns Timestamp seconds
 */
export function calculateExpirationTime(customDays?: number): number {
  const days = customDays ?? DEFAULT_EXPIRATION_DAYS;
  
  // 범위 제한
  const clampedDays = Math.max(
    MIN_EXPIRATION_DAYS,
    Math.min(MAX_EXPIRATION_DAYS, days)
  );
  
  const now = Date.now() / 1000;
  return now + (clampedDays * 24 * 60 * 60);
}

/**
 * 만료 기간 검증
 */
export function validateExpirationDays(days: number): boolean {
  return days >= MIN_EXPIRATION_DAYS && days <= MAX_EXPIRATION_DAYS;
}

/**
 * 만료까지 남은 일수 계산
 */
export function getDaysUntilExpiration(expiresAt: number): number {
  const now = Date.now() / 1000;
  const remaining = expiresAt - now;
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60)));
}

/**
 * 만료 임박 여부 확인 (D-1)
 */
export function isExpiringSoon(expiresAt: number): boolean {
  return getDaysUntilExpiration(expiresAt) <= 1;
}
