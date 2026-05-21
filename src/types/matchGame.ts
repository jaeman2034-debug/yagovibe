/**
 * 🔥 Match Game (경기 기록) 타입 정의
 * 
 * 경기 시스템의 핵심 타입 정의
 * 기존 Match (매칭) 타입과 구분됨
 */

import { Timestamp } from "firebase/firestore";

/**
 * 경기 상태
 */
export type MatchGameStatus = "scheduled" | "live" | "completed" | "cancelled";

/**
 * 경기 이벤트 타입
 */
export type MatchEventType = 
  | "goal"           // 골
  | "assist"         // 어시스트
  | "yellow_card"    // 경고
  | "red_card"       // 퇴장
  | "substitution";  // 교체

/**
 * 포지션 타입
 */
export type PlayerPosition = "GK" | "DF" | "MF" | "FW";

/**
 * 경기 결과
 */
export type MatchResult = "win" | "draw" | "loss";

/**
 * Match Game (경기 기록)
 */
export interface MatchGame {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  tournamentId?: string;
  tournamentName?: string;
  date: Timestamp;
  location: string;
  venueId?: string;
  status: MatchGameStatus;
  score: {
    home: number;
    away: number;
  };
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Match Lineup (경기 라인업)
 */
export interface MatchLineup {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  playerName: string;
  position: PlayerPosition;
  number: number;
  isStarter: boolean; // 선발/교체
  substitutionMinute?: number; // 교체 시간
  substitutionPlayerId?: string; // 교체된 선수
}

/**
 * Match Event (경기 이벤트)
 */
export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  minute: number;
  teamId: string;
  playerId: string;
  playerName: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  substitutionPlayerId?: string;
  substitutionPlayerName?: string;
  createdAt: Timestamp;
}

/**
 * Team Match (팀 경기 기록)
 */
export interface TeamMatch {
  id: string;
  matchId: string;
  opponentTeamId: string;
  opponentTeamName: string;
  isHome: boolean; // 홈/원정
  date: Timestamp;
  score: {
    team: number;
    opponent: number;
  };
  result: MatchResult;
  status: MatchGameStatus;
}
