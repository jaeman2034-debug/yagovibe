/**
 * 🔥 팀 정책 상수 정의 (v1 아키텍처 - 플랫폼 표준)
 *
 * ========================================
 * 📍 Canonical Policy Field (SSOT)
 * ========================================
 * 
 * 팀 정책 상태의 단일 진실 원천:
 * - teams/{teamId}.membership
 * 
 * 이 필드가 팀의 협회 정책 상태를 나타내는 유일한 기준입니다.
 * 
 * ⚠️ 중요: status 필드는 더 이상 사용하지 않습니다.
 *          모든 정책 판정은 membership 필드를 기준으로 합니다.
 * 
 * ========================================
 * 📊 Membership 값 의미
 * ========================================
 * 
 * | membership  | 의미                    | 설명                          |
 * | ----------- | ----------------------- | ----------------------------- |
 * | non-member  | 비회원팀                  | 일반 동호회, 회비 없음            |
 * | pending     | 협회 가입 신청 중          | 회원 전환 요청 접수됨              |
 * | member      | 협회 정회원                | 연 240만원 납부, 우선 대관 가능     |
 * | academy     | 아카데미/파트너 팀           | 비회원, 발전기금 100~200만원, 협회 통해 대관 |
 * 
 * ========================================
 * 🔄 TeamStatus 파생
 * ========================================
 * 
 * TeamStatus enum은 membership에서 파생되는 값입니다.
 * 
 * membership → TeamStatus 매핑:
 * - "non-member" → TeamStatus.NON_MEMBER
 * - "pending" → TeamStatus.PENDING
 * - "member" → TeamStatus.MEMBER
 * - "academy" → TeamStatus.ACADEMY
 * 
 * ⚠️ 중요: DB에는 membership만 저장하고,
 *          TeamStatus는 필요할 때 membership에서 파생합니다.
 * 
 * ========================================
 * 🎯 역할
 * ========================================
 * 
 * - 팀 정책 상태 값 검증 및 타입 안정성 보장
 * - membership → TeamStatus 변환 헬퍼 함수 제공
 * - 플랫폼 전역에서 사용하는 표준 타입 정의
 */

/**
 * 팀 정책 상태 상수 (플랫폼 표준)
 */
export const TEAM_MEMBERSHIPS = {
  NON_MEMBER: "non-member",
  PENDING: "pending",
  MEMBER: "member",
  ACADEMY: "academy",
} as const;

/**
 * 팀 정책 상태 허용 값 배열 (검증용)
 */
export const TEAM_MEMBERSHIP_VALUES = [
  "non-member",
  "pending",
  "member",
  "academy",
] as const;

/**
 * 팀 정책 상태 타입 (플랫폼 표준 - canonical field)
 * 
 * @see teams/{teamId}.membership
 */
export type TeamMembership = (typeof TEAM_MEMBERSHIP_VALUES)[number];

/**
 * 팀 정책 상태 검증
 *
 * @param membership - 검증할 membership 값
 * @returns 유효한 membership이면 true
 */
export function isValidTeamMembership(
  membership: string
): membership is TeamMembership {
  return TEAM_MEMBERSHIP_VALUES.includes(membership as TeamMembership);
}

/**
 * membership → TeamStatus 변환
 * 
 * @param membership - 팀 정책 상태 (canonical field)
 * @returns TeamStatus enum 값
 * 
 * @see src/types/policy.ts - TeamStatus enum 정의
 */
export function membershipToTeamStatus(
  membership: TeamMembership | string | undefined
): "MEMBER" | "NON_MEMBER" | "ACADEMY" | "PENDING" {
  if (!membership) {
    return "NON_MEMBER"; // 기본값
  }

  switch (membership) {
    case "member":
      return "MEMBER";
    case "non-member":
      return "NON_MEMBER";
    case "academy":
      return "ACADEMY";
    case "pending":
      return "PENDING";
    default:
      // 유효하지 않은 값은 기본값 반환
      return "NON_MEMBER";
  }
}

/**
 * TeamStatus → membership 변환
 * 
 * @param teamStatus - TeamStatus enum 값
 * @returns membership 값 (canonical field)
 */
export function teamStatusToMembership(
  teamStatus: "MEMBER" | "NON_MEMBER" | "ACADEMY" | "PENDING" | string
): TeamMembership {
  switch (teamStatus) {
    case "MEMBER":
      return "member";
    case "NON_MEMBER":
      return "non-member";
    case "ACADEMY":
      return "academy";
    case "PENDING":
      return "pending";
    default:
      // 기본값
      return "non-member";
  }
}

/**
 * 비회원팀 여부 확인
 */
export function isNonMember(membership: TeamMembership | string | undefined): boolean {
  return membership === TEAM_MEMBERSHIPS.NON_MEMBER;
}

/**
 * 회원팀 여부 확인
 */
export function isMember(membership: TeamMembership | string | undefined): boolean {
  return membership === TEAM_MEMBERSHIPS.MEMBER;
}

/**
 * 협회 가입 신청 중 여부 확인
 */
export function isPending(membership: TeamMembership | string | undefined): boolean {
  return membership === TEAM_MEMBERSHIPS.PENDING;
}

/**
 * 아카데미/파트너 팀 여부 확인
 */
export function isAcademy(membership: TeamMembership | string | undefined): boolean {
  return membership === TEAM_MEMBERSHIPS.ACADEMY;
}
