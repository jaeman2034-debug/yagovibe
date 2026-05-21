/**
 * 🔥 일정 권한 체크 함수
 * 
 * 권한 규칙:
 * - 생성 = 팀 소유자 또는 관리자만
 * - 수정/삭제 = 생성자 또는 팀 소유자/관리자
 * - 조회 = 팀 멤버 전체
 * - 참석 응답 = 팀 멤버 전체
 */

import type { Schedule } from "@/types/schedule";

export interface TeamMember {
  uid: string;
  role: string;
  accessLevel?: 'OWNER' | 'ADMIN' | 'STAFF' | 'MEMBER';
}

export interface Team {
  id: string;
  ownerId: string;
  admins?: string[];
}

/**
 * 일정 생성 권한 체크
 */
export function canCreateSchedule(
  user: { uid: string } | null,
  team: Team | null,
  teamMember: TeamMember | null
): boolean {
  if (!user || !team || !teamMember) return false;
  
  // 팀 소유자
  if (user.uid === team.ownerId) return true;
  
  // 관리자 (accessLevel이 OWNER 또는 ADMIN)
  if (teamMember.accessLevel === 'OWNER' || teamMember.accessLevel === 'ADMIN') {
    return true;
  }
  
  // admins 배열에 포함된 경우
  if (team.admins?.includes(user.uid)) return true;
  
  return false;
}

/**
 * 일정 수정/삭제 권한 체크
 */
export function canEditSchedule(
  user: { uid: string } | null,
  team: Team | null,
  teamMember: TeamMember | null,
  schedule: Schedule
): boolean {
  if (!user || !team || !teamMember) return false;
  
  // 생성자 본인
  if (schedule.creatorId === user.uid) return true;
  
  // 일정 생성 권한이 있으면 수정/삭제도 가능
  return canCreateSchedule(user, team, teamMember);
}

/**
 * 일정 조회 권한 체크 (팀 멤버면 모두 가능)
 */
export function canViewSchedule(
  user: { uid: string } | null,
  teamMember: TeamMember | null
): boolean {
  if (!user || !teamMember) return false;
  return teamMember.uid === user.uid;
}
