/**
 * 🔥 권한 모델 단일 진실 (F-1 LOCK)
 * 
 * 모든 권한 판단은 여기서만 수행
 */

export type Role = "owner" | "coach" | "staff" | "member";

/**
 * 역할별 권한 레벨 (숫자 높을수록 상위 권한)
 */
export const ROLE_POWER: Record<Role, number> = {
  owner: 100,
  coach: 80,
  staff: 50,
  member: 10,
};

/**
 * 권한 레벨 비교
 * 
 * @param myRole 내 역할
 * @param required 필요한 최소 역할
 * @returns true면 권한 있음
 */
export function hasPower(myRole: Role, required: Role): boolean {
  return ROLE_POWER[myRole] >= ROLE_POWER[required];
}

/**
 * 역할이 유효한지 확인
 */
export function isValidRole(role: string): role is Role {
  return role in ROLE_POWER;
}

/**
 * 역할 목록 (권한 순서)
 */
export const ROLES_BY_POWER: Role[] = ["owner", "coach", "staff", "member"];

