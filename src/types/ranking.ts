/**
 * 🔥 Ranking (랭킹) 타입 정의
 * 
 * 팀 및 선수 랭킹 타입 정의
 */

import { Timestamp } from "firebase/firestore";

/**
 * Team Ranking (팀 순위)
 */
export interface TeamRanking {
  id: string;
  seasonId: string;
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
  rank: number; // 순위 (1, 2, 3, ...)
  previousRank?: number; // 이전 순위
  rankChange?: number; // 순위 변동 (+1, -1, 0)
  updatedAt: Timestamp;
}

/**
 * Player Ranking (선수 랭킹)
 */
export interface PlayerRanking {
  id: string;
  seasonId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
  assists: number;
  matches: number;
  rank: number; // 순위
  updatedAt: Timestamp;
}

/**
 * Ranking Category (랭킹 카테고리)
 */
export type RankingCategory = "goals" | "assists" | "matches";
