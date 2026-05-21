/**
 * 🔥 시즌 시스템 타입 정의
 */

import { Timestamp } from "firebase/firestore";

/**
 * 시즌
 * 
 * 경로: seasons/{seasonId}
 */
export interface Season {
  id: string;
  name: string; // "2026 시즌"
  sportType: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: "upcoming" | "active" | "completed";
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * 시즌별 팀 통계
 * 
 * 경로: teams/{teamId}/season_stats/{seasonId}
 */
export interface SeasonStats {
  seasonId: string;
  teamId: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  winRate: number;
  lastResult: "win" | "draw" | "loss" | null;
  streakType: "win" | "loss" | "draw" | "none";
  streakCount: number;
  lastUpdatedAt: Timestamp;
}
