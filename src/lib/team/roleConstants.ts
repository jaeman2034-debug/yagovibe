/**
 * 🔥 팀 권한 상수 정의 (v1 아키텍처 - 플랫폼 표준)
 *
 * ========================================
 * 📍 Canonical Authority Source (SSOT)
 * ========================================
 * 
 * 권한의 단일 진실 원천:
 * - teams/{teamId}/members/{uid}.role
 * 
 * 이 필드가 권한 판정의 유일한 기준입니다.
 * 
 * ========================================
 * 📦 team_members Collection (캐시 인덱스)
 * ========================================
 * 
 * team_members 컬렉션은 빠른 조회를 위한 캐시 인덱스입니다.
 * 
 * 용도:
 * - 내 팀 목록 조회 (useMyTeams 등)
 * - 필터링 및 검색
 * - 통계 집계
 * 
 * ⚠️ 중요: 권한 판정은 절대 team_members를 사용하지 않습니다.
 *          항상 teams/{teamId}/members/{uid}를 직접 조회합니다.
 * 
 * ========================================
 * 🎯 역할
 * ========================================
 * 
 * - 팀 role 값 검증 및 타입 안정성 보장
 * - 일관된 권한 체크 헬퍼 함수 제공
 * - 플랫폼 전역에서 사용하는 표준 타입 정의
 */

/**
 * 팀 role 상수 (플랫폼 표준)
 */
export const TEAM_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

/**
 * 팀 role 허용 값 배열 (검증용)
 */
export const TEAM_ROLE_VALUES = ["owner", "admin", "member"] as const;

/**
 * 팀 role 타입 (플랫폼 표준)
 */
export type TeamRole = (typeof TEAM_ROLE_VALUES)[number];

/**
 * 팀 role 검증
 *
 * @param role - 검증할 role 값
 * @returns 유효한 role이면 true
 */
export function isValidTeamRole(role: string): role is TeamRole {
  return TEAM_ROLE_VALUES.includes(role as TeamRole);
}

/**
 * 팀장 role 확인
 */
export function isTeamOwner(role: string | undefined): boolean {
  return role === TEAM_ROLES.OWNER;
}

/**
 * 팀 관리자 role 확인 (owner 또는 admin) - 팀장/부팀장
 */
export function isTeamAdmin(role: string | undefined): boolean {
  return role === TEAM_ROLES.OWNER || role === TEAM_ROLES.ADMIN;
}

/**
 * 팀장/부팀장 여부 (isTeamAdmin 별칭, 가독성용)
 */
export function isCaptain(role: string | undefined): boolean {
  return isTeamAdmin(role);
}

/**
 * 팀원 role 확인
 */
export function isTeamMember(role: string | undefined): boolean {
  return role === TEAM_ROLES.MEMBER;
}

/**
 * team_members 역인덱스 타입 (캐시용)
 * 
 * ⚠️ 캐시 전용 - 권한 판정에 사용 금지
 * 
 * Canonical source:
 * - teams/{teamId}/members/{uid}.role
 * 
 * team_members 컬렉션:
 * - 빠른 조회용 캐시 (내 팀 목록, 필터링 등)
 * - 권한 판정은 반드시 members/{uid} 직접 조회
 * 
 * @see guardTeamAccess - 권한 체크 예제
 */
export interface TeamMemberIndex {
  userId: string;
  teamId: string;
  role: TeamRole; // ⚠️ cache only - 권한 판정은 members/{uid} 사용
}
