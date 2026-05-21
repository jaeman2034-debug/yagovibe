/**
 * 🔥 Player Stats Engine 타입 정의
 * 
 * 역할: 선수 기록 통계 시스템
 * 
 * 구조:
 * - player_games: 경기별 선수 기록 (원본)
 * - player_event_summaries: 행사별 누적 기록
 * - player_season_summaries: 시즌별 누적 기록
 * - leaderboards: 리더보드 캐시
 */

import { Timestamp } from "firebase/firestore";

/**
 * Player Event Summary (행사별 선수 누적 기록)
 * 
 * 경로: player_event_summaries/{summaryId}
 * ID 형식: {eventId}_{divisionId}_{playerId}
 */
export interface PlayerEventSummary {
  id: string;
  
  // 계층 정보
  eventId: string;
  divisionId?: string | null;
  seasonId: string;
  
  // 선수/팀 정보
  playerId: string;
  playerName: string;              // denormalized
  teamId: string;
  teamName?: string;              // denormalized
  
  // 출전 통계
  appearances: number;            // 출전 횟수
  starts: number;                 // 선발 출전 횟수
  minutesPlayed: number;          // 총 출전 시간 (분)
  
  // 기록
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  
  // 메타데이터
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

/**
 * Player Season Summary (시즌별 선수 누적 기록)
 * 
 * 경로: player_season_summaries/{summaryId}
 * ID 형식: {seasonId}_{playerId}
 */
export interface PlayerSeasonSummary {
  id: string;
  
  // 계층 정보
  seasonId: string;
  
  // 선수/팀 정보
  playerId: string;
  playerName: string;              // denormalized
  teamId: string;
  teamName?: string;              // denormalized
  
  // 출전 통계
  appearances: number;            // 출전 횟수
  starts: number;                 // 선발 출전 횟수
  minutesPlayed: number;          // 총 출전 시간 (분)
  
  // 기록
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  
  // 메타데이터
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

/**
 * Leaderboard (리더보드 캐시)
 * 
 * 경로: leaderboards/{leaderboardId}
 * ID 형식: {scope}_{scopeId}_{category}_{playerId}
 */
export interface Leaderboard {
  id: string;
  
  // 범위
  scope: "event" | "division" | "season";
  eventId?: string;
  divisionId?: string | null;
  seasonId?: string;
  
  // 카테고리
  category: "goals" | "assists" | "appearances" | "yellow_cards" | "red_cards";
  
  // 선수 정보
  playerId: string;
  playerName: string;              // denormalized
  teamId: string;
  teamName?: string;               // denormalized
  
  // 순위 정보
  value: number;                   // 기록 값
  rank: number;                     // 순위 (1, 2, 3...)
  
  // 메타데이터
  updatedAt: Timestamp;
}
