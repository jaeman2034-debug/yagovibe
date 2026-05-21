import { Timestamp } from "firebase/firestore";

/**
 * 🔥 팀 경기 기록 타입
 * 
 * 역할: 모든 실제 경기 기록의 공통 표준 레이어
 */

/** `team_games.playParticipation` — 라인업/출전시간이 있으면 시뮬 등에 반영 */
export type TeamGamePlayParticipationEntry = {
  memberId: string;
  /** 실제 출전 분(우선) */
  minutesPlayed?: number;
  /** 출전 쿼터 수(분 없을 때 근사) */
  quartersPlayed?: number;
  /** 해당 경기 기준 포지션 라벨(선택) */
  snapshotPosition?: string;
};

export type TeamGamePlayParticipation = {
  byTeam?: Record<string, { entries: TeamGamePlayParticipationEntry[] }>;
  /** 쿼터당 길이(분) — 예: [15,15,15,15]. 없으면 시뮬 기본값 */
  quarterMinutePlan?: number[];
};

/**
 * 팀 경기 기록
 */
export interface TeamGame {
  id: string;
  sportType: string;
  gameType: "friendly" | "league" | "tournament" | "scrimmage";
  sourceType: "manual" | "match" | "tournament" | "league" | "event";
  sourceId?: string | null;
  seasonId?: string | null; // 시즌 ID (선택적, 하위 호환)
  eventId?: string | null; // Event ID (선택적)
  divisionId?: string | null; // Event Division ID (선택적)
  roundCode?: string | null; // 라운드 코드 (예: "QF", "SF", "F")
  roundName?: string | null; // 라운드명 (예: "8강", "4강", "결승")
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  scheduledAt: Timestamp;
  playedAt?: Timestamp;
  location?: string | null;
  address?: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string | null;
  resultType?: "home-win" | "away-win" | "draw" | null;
  createdBy: string;
  recordedBy?: string | null;
  recordedAt?: Timestamp | null;
  notes?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  /**
   * 경기별 출전 스냅샷 (점진 도입)
   * — 팀 플레이 시뮬 등에서 `teamId` 키로 조회
   */
  playParticipation?: TeamGamePlayParticipation | null;
}

/**
 * 팀 통계 (denormalized)
 * 
 * 경로: teams/{teamId}.stats
 */
export interface TeamStats {
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
