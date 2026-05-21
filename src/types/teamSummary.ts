/**
 * 🔥 Team Summary 타입 정의
 * 
 * 역할: 팀 페이지 성능 최적화를 위한 집계 문서
 * 경로: team_summary/{teamId}
 */

import { Timestamp } from "firebase/firestore";

/**
 * Team Summary (팀 누적 기록 요약)
 */
export interface TeamSummary {
  id: string; // teamId와 동일
  teamId: string;
  organizationId?: string | null;

  // 전적
  matches: number;
  wins: number;
  draws: number;
  losses: number;

  // 득실
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;

  // 추가 통계
  cleanSheets: number; // 무실점 경기 수

  // 성과
  championships: number; // 우승 횟수
  runnerUps: number; // 준우승 횟수
  semifinals: number; // 4강 횟수

  // 메타데이터
  lastMatchAt?: Timestamp | null;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

/**
 * Team Match History (팀 경기 이력)
 * 
 * 경로: team_match_history/{teamId_matchId}
 * 역할: 팀 페이지에서 경기 목록 빠른 조회
 */
export interface TeamMatchHistory {
  id: string; // {teamId}_{matchId}
  teamId: string;
  matchId: string;
  eventId: string;
  organizationId?: string | null;

  // 상대팀 정보
  opponentTeamId: string;
  opponentTeamName?: string;

  // 경기 정보
  isHome: boolean; // 홈팀 여부
  scored: number; // 득점
  conceded: number; // 실점
  result: "win" | "draw" | "loss";

  // 대회 정보
  stageLabel?: string; // "16강", "8강", "결승" 등
  roundCode?: string; // "R16", "QF", "SF", "F"
  matchDate: Timestamp;

  // 메타데이터
  createdAt: Timestamp;
}

/**
 * Team Award (팀 수상)
 * 
 * 경로: team_awards/{awardId}
 */
export interface TeamAward {
  id: string;
  teamId: string;
  eventId: string;
  organizationId?: string | null;

  awardType: "champion" | "runner_up" | "semifinalist" | "fair_play";
  title: string; // "2026 봄 리그 우승"

  awardedAt: Timestamp;
  createdAt: Timestamp;
}
