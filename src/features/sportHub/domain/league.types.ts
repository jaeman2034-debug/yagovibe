/**
 * 🔥 League Types - 리그 도메인 모델
 * 
 * 리그는 팀의 "무대"
 */

import type { Region } from "./region.types";

/**
 * 리그 상태
 */
export type LeagueStatus = "READY" | "RUNNING" | "ENDED" | "CANCELLED";

/**
 * 리그 타입
 */
export type LeagueType = "tournament" | "league" | "friendly";

/**
 * 경기 결과
 */
export type MatchResult = {
  home: number;
  away: number;
  isDraw: boolean;
  winner?: "home" | "away";
};

/**
 * 경기
 */
export type Match = {
  id: string;
  leagueId: string;
  
  homeTeamId: string;
  awayTeamId: string;
  
  groundId: string;
  scheduledAt: string;    // ISO string
  
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  result?: MatchResult;
  
  // 예약 연결
  reservationId?: string;
  
  createdAt: string;
  updatedAt: string;
};

/**
 * 리그
 */
export type League = {
  id: string;
  region: Region;
  
  name: string;
  season: string;          // "2025-spring"
  type: LeagueType;
  
  teams: string[];        // teamId[]
  matches: Match[];
  
  status: LeagueStatus;
  
  // 리그 설정
  startDate: string;       // ISO string
  endDate?: string;        // ISO string
  matchFormat?: "8v8" | "11v11" | "5v5";
  
  // 운영 정보
  organizerId?: string;    // 리그 운영자
  associationId?: string;  // 협회 ID (공식 리그)
  
  createdAt: string;
  updatedAt: string;
};

/**
 * 리그 랭킹
 */
export type LeagueRanking = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;          // 승점 (승 3, 무 1, 패 0)
  goalDifference: number;  // 골득실
  rank: number;
};
