/**
 * 🔥 Team Onboarding - 팀 온보딩 플로우
 * 
 * 유저 → 팀 찾기 → 가입 신청 → 승인 → 팀 캘린더
 */

import type { Team, TeamJoinRequest } from "./team.types";
import { canJoinTeam } from "./team.permission";

/**
 * 팀 가입 신청 생성
 */
export function createJoinRequest(
  team: Team,
  userId: string,
  message?: string
): TeamJoinRequest | null {
  // 가입 가능 여부 확인
  if (!canJoinTeam(team, userId)) {
    return null;
  }
  
  const now = new Date().toISOString();
  
  return {
    id: `join-${team.id}-${userId}-${Date.now()}`,
    teamId: team.id,
    userId,
    message,
    status: "pending",
    createdAt: now,
  };
}

/**
 * 팀 가입 신청 승인
 */
export function approveJoinRequest(
  request: TeamJoinRequest,
  approvedBy: string
): TeamJoinRequest {
  return {
    ...request,
    status: "approved",
    reviewedAt: new Date().toISOString(),
    reviewedBy: approvedBy,
  };
}

/**
 * 팀 가입 신청 거절
 */
export function rejectJoinRequest(
  request: TeamJoinRequest,
  rejectedBy: string
): TeamJoinRequest {
  return {
    ...request,
    status: "rejected",
    reviewedAt: new Date().toISOString(),
    reviewedBy: rejectedBy,
  };
}

/**
 * 팀 멤버 추가 (가입 신청 승인 후)
 */
export function addTeamMember(
  team: Team,
  userId: string,
  role: "member" = "member"
): Team {
  const now = new Date().toISOString();
  
  const newMember = {
    userId,
    role,
    joinedAt: now,
    status: "active" as const,
  };
  
  // 중복 체크
  const existingIndex = team.members.findIndex((m) => m.userId === userId);
  if (existingIndex >= 0) {
    // 이미 존재하면 업데이트
    const updated = [...team.members];
    updated[existingIndex] = {
      ...updated[existingIndex],
      status: "active",
    };
    return {
      ...team,
      members: updated,
      updatedAt: now,
    };
  }
  
  return {
    ...team,
    members: [...team.members, newMember],
    updatedAt: now,
  };
}

/**
 * 팀 모집 상태 업데이트
 */
export function updateRecruitStatus(
  team: Team,
  status: Team["recruitStatus"]
): Team {
  return {
    ...team,
    recruitStatus: status,
    updatedAt: new Date().toISOString(),
  };
}
