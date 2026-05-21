/**
 * 스포츠 데이터 API 서비스 레이어 (무료 ESPN BFF 버전)
 *
 * ESPN BFF 서버를 통해 무료로 스포츠 데이터를 제공합니다.
 * Intent 시스템과 완벽하게 호환됩니다.
 */

// ============================================
// 타입 정의
// ============================================

export type LeagueCode = "MLB" | "NBA" | "NFL" | "EPL" | "KBO";

export interface Game {
  id: string;
  league: LeagueCode | string;
  startTime: string; // ISO
  status: "scheduled" | "live" | "finished";
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface StandingRow {
  league: LeagueCode | string;
  team: string;
  rank: number | null;
  wins: number | null;
  losses: number | null;
  draws?: number | null;
}

// ============================================
// 설정
// ============================================

const BFF_BASE = import.meta.env.VITE_BFF_BASE_URL ?? "http://localhost:4000/api";

// ============================================
// 공통 fetch 래퍼
// ============================================

async function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const url = new URL(path, BFF_BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`BFF API error ${res.status}`);
  }
  return (await res.json()) as T;
}

// ============================================
// 날짜 유틸리티
// ============================================

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * DateIntent를 YYYY-MM-DD 형식으로 변환
 * (기존 normalizeDateIntent 함수 사용)
 */
import type { DateIntent } from "@/utils/parseDateIntent";

export function normalizeDateIntent(dateIntent: DateIntent): string | undefined {
  if (!dateIntent) return undefined;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);

  switch (dateIntent) {
    case "today":
      return formatDate(today);
    case "tomorrow":
      return formatDate(tomorrow);
    case "dayAfterTomorrow":
      return formatDate(dayAfterTomorrow);
    case "thisWeek":
      // 이번 주 일요일부터 토요일까지의 범위 (시작일 반환)
      const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      return formatDate(firstDayOfWeek);
    case "nextWeek":
      // 다음 주 일요일부터 토요일까지의 범위 (시작일 반환)
      const firstDayOfNextWeek = new Date(today.setDate(today.getDate() - today.getDay() + 7));
      return formatDate(firstDayOfNextWeek);
    default:
      if (dateIntent.type === "absoluteDate") {
        return dateIntent.date;
      }
      return undefined;
  }
}

// ============================================
// 리그 추론 헬퍼 (leagueMapper.ts에서 import)
// ============================================

import {
  inferLeagueFromTeam,
  inferLeagueFromPlayer,
  inferLeagueFromSport,
} from "@/utils/leagueMapper";

// ============================================
// API 함수들
// ============================================

/**
 * 특정 날짜의 경기 조회
 */
export async function fetchGamesByDate(params: {
  league: LeagueCode;
  date: string; // YYYY-MM-DD
}): Promise<Game[]> {
  const json = await apiGet<{ games: Game[] }>("/games", {
    league: params.league,
    date: params.date,
  });
  return json.games;
}

/**
 * 오늘 경기 조회 (간편 래퍼)
 */
export async function fetchTodayGames(params: { league: LeagueCode }): Promise<Game[]> {
  const today = new Date();
  const dateStr = formatDate(today);
  return fetchGamesByDate({ league: params.league, date: dateStr });
}

/**
 * 리그 순위 조회
 */
export async function fetchLeagueRanking(league: LeagueCode): Promise<StandingRow[]> {
  const json = await apiGet<{ standings: StandingRow[] }>("/standings", {
    league,
  });
  return json.standings;
}

/**
 * 팀 기준 일정 조회
 * 
 * /api/games 엔드포인트에 team 파라미터를 추가하여 필터링합니다.
 * 한국어 팀명도 자동으로 영문 팀명으로 변환됩니다.
 */
export async function fetchTeamGames(params: {
  teamName: string;
  league?: LeagueCode;
  date?: string;
  sport?: string;
}): Promise<Game[]> {
  const league = params.league || "MLB";
  const date = params.date || formatDate(new Date());
  
  // BFF 서버의 /api/games 엔드포인트에 team 파라미터 추가
  const json = await apiGet<{ games: Game[] }>("/games", {
    league,
    date,
    team: params.teamName, // 한국어 팀명도 자동 변환됨
  });
  
  return json.games || [];
}

/**
 * 선수 기준 경기 조회
 */
export async function fetchPlayerGames(params: {
  playerName: string;
  league?: LeagueCode;
  date?: string;
  sport?: string;
}): Promise<Game[]> {
  const league = params.league || "MLB";
  const date = params.date || formatDate(new Date());
  
  // BFF 서버의 /api/player 엔드포인트 사용
  const json = await apiGet<{ games: Game[] }>("/player", {
    name: params.playerName,
    league,
    date,
  });
  
  return json.games || [];
}

/**
 * 선수 하이라이트 조회 (선택적 - 나중에 확장)
 */
export async function fetchPlayerHighlight(params: {
  playerName: string;
  league?: LeagueCode;
  sport?: string;
}): Promise<any> {
  // ESPN API에서는 하이라이트를 직접 제공하지 않으므로,
  // 최근 경기 데이터를 반환
  const league = params.league || "MLB";
  const today = formatDate(new Date());
  
  const games = await fetchGamesByDate({ league, date: today });
  
  return {
    player: params.playerName,
    games,
    highlights: [], // ESPN API 제한으로 빈 배열 반환
  };
}
