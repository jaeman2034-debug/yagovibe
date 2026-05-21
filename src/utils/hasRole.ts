/**
 * 🔥 권한 체크 유틸
 * 
 * 역할:
 * - Firestore users/{uid}.role 기준 권한 제어
 * - 라우트 + UI + 보안 규칙까지 일관되게 사용
 * - 나중에 manager, support 확장 쉬운 구조
 * 
 * 사용 예시:
 * ```tsx
 * const { profile } = useAuthUser();
 * 
 * if (hasRole(profile, ["admin"])) {
 *   return <AdminPanel />;
 * }
 * ```
 */

import type { UserProfile } from "@/types/user";

/**
 * 사용자가 지정된 역할 중 하나를 가지고 있는지 확인
 * 
 * @param profile - Firestore 유저 프로필 (null 가능)
 * @param roles - 허용할 역할 배열
 * @returns 권한이 있으면 true, 없으면 false
 */
export function hasRole(
  profile: UserProfile | null,
  roles: Array<UserProfile["role"]>
): boolean {
  if (!profile) return false;
  if (!profile.role) return false;
  // 🔥 대문자로 통일하여 비교
  const profileRoleUpper = profile.role?.toUpperCase();
  return roles.some(r => r?.toUpperCase() === profileRoleUpper);
}

/**
 * 사용자가 관리자인지 확인
 * 
 * @param profile - Firestore 유저 프로필 (null 가능)
 * @returns 관리자면 true, 아니면 false
 * 
 * 🔥 주의: Firestore rules는 "ADMIN" (대문자)를 체크하므로
 * 소문자 "admin"과 대문자 "ADMIN" 모두 허용
 */
export function isAdmin(profile: UserProfile | null): boolean {
  if (!profile || !profile.role) return false;
  // 🔥 대문자로 통일하여 비교
  return profile.role.toUpperCase() === "ADMIN";
}

/**
 * 사용자가 일반 유저인지 확인
 * 
 * @param profile - Firestore 유저 프로필 (null 가능)
 * @returns 일반 유저면 true, 아니면 false
 */
export function isUser(profile: UserProfile | null): boolean {
  return hasRole(profile, ["user"]);
}
