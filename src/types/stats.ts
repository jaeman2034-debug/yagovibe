/**
 * 🔥 Stats (통계) 타입 정의
 * 
 * 선수 및 팀 통계 타입 정의
 */

import { Timestamp } from "firebase/firestore";

/**
 * Player Stats (선수 통계)
 */
export interface PlayerStats {
  id: string;
  seasonId: string; // "2024" 또는 "2024-spring"
  matches: number; // 출전 경기 수
  goals: number; // 득점
  assists: number; // 어시스트
  yellowCards: number; // 경고
  redCards: number; // 퇴장
  minutesPlayed: number; // 출전 시간 (분)
  cleanSheets?: number; // 클린시트 (GK)
  saves?: number; // 세이브 (GK)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Team Stats (팀 통계)
 */
export interface TeamStats {
  id: string;
  seasonId: string;
  matches: number; // 경기 수
  wins: number; // 승
  draws: number; // 무
  losses: number; // 패
  goalsFor: number; // 득점
  goalsAgainst: number; // 실점
  goalDifference: number; // 득실차
  points: number; // 승점 (wins * 3 + draws * 1)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Tournament Team Stats (대회 팀 통계)
 */
export interface TournamentTeamStats {
  id: string;
  teamId: string;
  teamName: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number; // 순위
  updatedAt: Timestamp;
}
