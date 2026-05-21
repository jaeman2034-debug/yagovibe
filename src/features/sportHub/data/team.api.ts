/**
 * 🔥 Team API - 팀 API 클라이언트
 */

import type { Team, TeamJoinRequest } from "../domain/team.types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 팀 목록 조회
 */
export async function getTeams(params?: {
  region?: string;
  level?: string;
  recruitStatus?: string;
}): Promise<Team[]> {
  const query = new URLSearchParams();
  if (params?.region) query.set("region", params.region);
  if (params?.level) query.set("level", params.level);
  if (params?.recruitStatus) query.set("recruitStatus", params.recruitStatus);

  const res = await fetch(`${API_BASE}/teams?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`팀 목록 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 팀 상세 조회
 */
export async function getTeam(id: string): Promise<Team> {
  const res = await fetch(`${API_BASE}/teams/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`팀 상세 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 팀 가입 신청
 */
export async function requestTeamJoin(
  teamId: string,
  message?: string
): Promise<TeamJoinRequest> {
  const res = await fetch(`${API_BASE}/teams/${teamId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`팀 가입 신청 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 팀 생성
 */
export async function createTeam(team: Omit<Team, "id" | "createdAt" | "updatedAt">): Promise<Team> {
  const res = await fetch(`${API_BASE}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(team),
  });

  if (!res.ok) {
    throw new Error(`팀 생성 실패: ${res.status}`);
  }

  return res.json();
}
