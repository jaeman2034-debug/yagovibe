/**
 * 🔥 리그 시스템 타입 정의
 */

import { Timestamp } from "firebase/firestore";

/**
 * 리그
 * 
 * 경로: leagues/{leagueId}
 */
export interface League {
  id: string;
  name: string;
  sportType: string;
  season: string; // "2026"
  region: string;
  status: "registration" | "active" | "completed";
  startDate: Timestamp;
  endDate: Timestamp;
  createdBy: string;
  description?: string;
  /** 참가비(원). 미설정이면 무료·별도 징수 등 행사 규정에 따름 */
  entryFeeKrw?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * 리그 참가 팀
 * 
 * 경로: league_teams/{id}
 */
export interface LeagueTeam {
  id: string;
  leagueId: string;
  teamId: string;
  teamName: string;
  joinedAt: Timestamp;
  status: "active" | "withdrawn";
}

/**
 * 리그 경기
 * 
 * 경로: league_games/{gameId}
 */
export interface LeagueGame {
  id: string;
  leagueId: string;
  round?: number; // 라운드 번호
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  scheduledAt: Timestamp;
  playedAt?: Timestamp;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "completed" | "cancelled";
  teamGameId?: string; // team_games 연결 ID
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * 리그 순위
 * 
 * 경로: league_standings/{leagueId}_{teamId}
 */
export interface LeagueStanding {
  id: string; // leagueId_teamId
  leagueId: string;
  teamId: string;
  teamName: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number; // 승점 (승*3 + 무*1)
  lastUpdatedAt: Timestamp;
}
