/**
 * 🔥 Player Summary 타입 정의
 * 
 * 역할: 선수 페이지 성능 최적화를 위한 집계 문서
 * 경로: player_summary/{playerId}
 */

import { Timestamp } from "firebase/firestore";

/**
 * Player Summary (선수 누적 기록 요약)
 */
export interface PlayerSummary {
  id: string; // playerId와 동일
  playerId: string;
  organizationId?: string | null;
  currentTeamId?: string | null;

  // 출전 통계
  appearances: number; // 출전 횟수
  starts: number; // 선발 출전 횟수
  totalMinutesPlayed: number; // 총 출전 시간 (분)

  // 기록
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;

  // 수상
  mvpAwards: number;
  topScorerAwards: number;
  best11Awards: number;

  // 메타데이터
  lastMatchAt?: Timestamp | null;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

/**
 * Player Match History (선수 경기 이력)
 * 
 * 경로: player_match_history/{playerId_matchId}
 * 역할: 선수 페이지에서 경기 목록 빠른 조회
 */
export interface PlayerMatchHistory {
  id: string; // {playerId}_{matchId}
  playerId: string;
  matchId: string;
  eventId: string;
  organizationId?: string | null;

  // 팀 정보
  teamId: string;
  teamName?: string;
  opponentTeamId: string;
  opponentTeamName?: string;

  // 경기 정보
  matchDate: Timestamp;
  stageLabel?: string; // "16강", "8강", "결승" 등
  roundCode?: string; // "R16", "QF", "SF", "F"

  // 기록
  starter: boolean;
  appearance: boolean;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;

  // 결과
  result?: "win" | "draw" | "loss"; // 팀 결과

  // 메타데이터
  createdAt: Timestamp;
}

/**
 * Player Award (선수 수상)
 * 
 * 경로: player_awards/{awardId}
 */
export interface PlayerAward {
  id: string;
  playerId: string;
  teamId?: string | null;
  eventId: string;
  organizationId?: string | null;

  awardType: "top_scorer" | "top_assist" | "mvp" | "best11" | "fair_play";
  title: string; // "2026 봄 리그 득점왕"

  awardedAt: Timestamp;
  createdAt: Timestamp;
}
