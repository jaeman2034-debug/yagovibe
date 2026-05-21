/**
 * 🔥 League API - 리그 API 클라이언트
 */

import type { League, Match, LeagueRanking } from "../domain/league.types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 리그 목록 조회
 */
export async function getLeagues(params?: {
  region?: string;
  status?: string;
}): Promise<League[]> {
  const query = new URLSearchParams();
  if (params?.region) query.set("region", params.region);
  if (params?.status) query.set("status", params.status);

  const res = await fetch(`${API_BASE}/leagues?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`리그 목록 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 리그 상세 조회
 */
export async function getLeague(id: string): Promise<League> {
  const res = await fetch(`${API_BASE}/leagues/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`리그 상세 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 경기 결과 입력
 */
export async function recordMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homeScore, awayScore }),
  });

  if (!res.ok) {
    throw new Error(`경기 결과 입력 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 리그 랭킹 조회
 */
export async function getLeagueRanking(leagueId: string): Promise<LeagueRanking[]> {
  const res = await fetch(`${API_BASE}/leagues/${leagueId}/ranking`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`리그 랭킹 조회 실패: ${res.status}`);
  }

  return res.json();
}
