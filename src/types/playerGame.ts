/**
 * 🔥 Player Game 타입 정의
 * 
 * 역할: 선수 개인 경기 기록
 * 경로: player_games/{playerGameId}
 */

import { Timestamp } from "firebase/firestore";

/**
 * Player Game (선수 경기 기록)
 */
export interface PlayerGame {
  id: string;
  
  // 계층 정보
  matchId: string;
  eventId?: string | null;
  divisionId?: string | null;
  seasonId?: string | null;

  // 팀/선수 정보
  teamId: string;
  playerId: string;
  playerName: string;              // denormalized

  // 출전 정보
  appearance: boolean;
  starter: boolean;
  minutesPlayed: number;

  // 기록
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;

  // 경기 정보
  playedAt: Timestamp;

  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
