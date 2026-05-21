/**
 * 🔥 플랫폼 권한 상수 정의 (v1 아키텍처)
 * 
 * 역할:
 * - 플랫폼 role 값 검증
 * - 타입 안정성 보장
 * - 일관된 권한 체크
 */

/**
 * 플랫폼 role 허용 값 (대문자만)
 */
export const PLATFORM_ROLES = ["ADMIN", "USER"] as const;

/**
 * 플랫폼 role 타입
 */
export type PlatformRole = typeof PLATFORM_ROLES[number];

/**
 * 플랫폼 role 검증
 * 
 * @param role - 검증할 role 값
 * @returns 유효한 role이면 true
 */
export function isValidPlatformRole(role: string | undefined): role is PlatformRole {
  if (!role) return false;
  return PLATFORM_ROLES.includes(role.toUpperCase() as PlatformRole);
}

/**
 * 플랫폼 관리자 role 확인
 */
export function isPlatformAdmin(role: string | undefined): boolean {
  if (!role) return false;
  return role.toUpperCase() === "ADMIN";
}

/**
 * 일반 사용자 role 확인
 */
export function isPlatformUser(role: string | undefined): boolean {
  if (!role) return false;
  return role.toUpperCase() === "USER";
}
