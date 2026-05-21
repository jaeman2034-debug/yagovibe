/**
 * 연령대 구분
 */
export type AgeDivision = "youth" | "middle" | "senior" | "silver";

/**
 * 연령대 레이블
 */
export const AGE_DIVISION_LABELS: Record<AgeDivision, string> = {
  youth: "청년부 (20/30대)",
  middle: "장년부 (40대)",
  senior: "노장부 (50대)",
  silver: "실버부 (60대)",
};

/**
 * 경기 슬롯 (팀 또는 다른 경기의 승자)
 */
export type MatchSlot =
  | { type: "TEAM"; teamName: string }
  | {
      type: "WINNER_OF_MATCH";
      refMatchId: string;
      refMatchNumber?: string;
    };

/**
 * 경기 정보
 */
export interface Match {
  id: string;
  matchNumber: string;
  division: AgeDivision;
  round: string;
  order: number;
  date: string; // ISO 형식 (YYYY-MM-DDTHH:mm:ss)
  time: string; // HH:mm
  venueId: string;
  venue?: string; // 하위 호환성
  homeSlot?: MatchSlot;
  awaySlot?: MatchSlot;
  teamA?: string; // 하위 호환성
  teamB?: string; // 하위 호환성
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scoreA?: number;
  scoreB?: number;
  winner?: "A" | "B" | "HOME" | "AWAY";
  resultType?: "FT" | "PK" | "ET"; // 전반 / 승부차기 / 연장
  notes?: string;
}

/**
 * 대진표 (연령대별)
 */
export interface Bracket {
  division: AgeDivision;
  matches: Match[];
  confirmed: boolean;
}

/**
 * 대회 정보
 */
export interface Tournament {
  id: string;
  name: string;
  associationId: string;
  startDate?: any; // Timestamp
  endDate?: any; // Timestamp
  createdAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
}

/**
 * 대회 결과
 * 경로: tournamentResults/{id}
 */
export interface TournamentResult {
  id: string;
  tournamentId: string;
  teamId: string;
  rank?: number; // 1, 2, 3...
  score?: number; // 점수 기반일 경우
  resultText?: string; // "8강", "예선 탈락" 등
  recordedAt: any; // Timestamp
}
