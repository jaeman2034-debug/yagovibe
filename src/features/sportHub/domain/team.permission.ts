/**
 * 🔥 Team Permission - 팀 권한 관리
 * 
 * 사용자 역할별 권한 분리
 */

import type { Team, TeamMember, TeamMemberRole } from "./team.types";

/**
 * 사용자 역할
 */
export type UserRole = "guest" | "user" | "team_owner" | "team_manager" | "league_organizer" | "association";

/**
 * 권한 매트릭스
 */
const PERMISSIONS: Record<UserRole, {
  canViewTeam: boolean;
  canJoinTeam: boolean;
  canManageMembers: boolean;
  canManageSchedule: boolean;
  canCreateLeague: boolean;
  canManageLeague: boolean;
}> = {
  guest: {
    canViewTeam: true,
    canJoinTeam: false,
    canManageMembers: false,
    canManageSchedule: false,
    canCreateLeague: false,
    canManageLeague: false,
  },
  user: {
    canViewTeam: true,
    canJoinTeam: true,
    canManageMembers: false,
    canManageSchedule: false,
    canCreateLeague: false,
    canManageLeague: false,
  },
  team_owner: {
    canViewTeam: true,
    canJoinTeam: false,
    canManageMembers: true,
    canManageSchedule: true,
    canCreateLeague: true,
    canManageLeague: false,
  },
  team_manager: {
    canViewTeam: true,
    canJoinTeam: false,
    canManageMembers: true,
    canManageSchedule: true,
    canCreateLeague: false,
    canManageLeague: false,
  },
  league_organizer: {
    canViewTeam: true,
    canJoinTeam: true,
    canManageMembers: false,
    canManageSchedule: false,
    canCreateLeague: true,
    canManageLeague: true,
  },
  association: {
    canViewTeam: true,
    canJoinTeam: false,
    canManageMembers: false,
    canManageSchedule: false,
    canCreateLeague: true,
    canManageLeague: true,
  },
};

/**
 * 팀에서 사용자 역할 확인
 */
export function getUserRoleInTeam(
  team: Team,
  userId: string
): TeamMemberRole | null {
  const member = team.members.find((m) => m.userId === userId);
  if (!member || member.status !== "active") {
    return null;
  }
  return member.role;
}

/**
 * 팀 권한 확인
 */
export function canManageTeam(
  team: Team,
  userId: string
): boolean {
  const role = getUserRoleInTeam(team, userId);
  return role === "owner" || role === "admin";
}

/**
 * 팀 일정 관리 권한 확인
 */
export function canManageTeamSchedule(
  team: Team,
  userId: string
): boolean {
  return canManageTeam(team, userId);
}

/**
 * 팀 멤버 관리 권한 확인
 */
export function canManageTeamMembers(
  team: Team,
  userId: string
): boolean {
  return canManageTeam(team, userId);
}

/**
 * 팀 가입 신청 권한 확인
 */
export function canJoinTeam(
  team: Team,
  userId: string
): boolean {
  // 이미 멤버인지 확인
  const existingMember = team.members.find((m) => m.userId === userId);
  if (existingMember) {
    return false; // 이미 멤버
  }
  
  // 모집 상태 확인
  if (team.recruitStatus === "CLOSE" || team.recruitStatus === "FULL") {
    return false;
  }
  
  return true;
}

/**
 * 리그 생성 권한 확인
 */
export function canCreateLeague(userRole: UserRole): boolean {
  return PERMISSIONS[userRole].canCreateLeague;
}

/**
 * 리그 관리 권한 확인
 */
export function canManageLeague(
  league: { organizerId?: string; associationId?: string },
  userId: string,
  userRole: UserRole
): boolean {
  if (userRole === "association") {
    return true; // 협회는 모든 리그 관리 가능
  }
  
  if (userRole === "league_organizer") {
    return league.organizerId === userId;
  }
  
  return false;
}
