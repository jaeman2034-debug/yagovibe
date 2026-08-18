/** Sprint F-2.1 — Academy Attendance Intelligence */

export type AcademyAttendanceRiskType =
  | "LOW_RATE"
  | "CONSECUTIVE_ABSENCE"
  | "RECENT_DECLINE";

export const ACADEMY_ATTENDANCE_RISK_THRESHOLD_PCT = 70;
export const ACADEMY_ATTENDANCE_CONSECUTIVE_ABSENCE_THRESHOLD = 3;
export const ACADEMY_ATTENDANCE_DECLINE_DELTA_PCT = 15;

export type AcademyAttendanceKpi = {
  avgAttendanceRatePct: number | null;
  avgLateRatePct: number | null;
  avgAbsentRatePct: number | null;
  atRiskPlayerCount: number;
  consecutiveAbsencePlayerCount: number;
  playersWithData: number;
};

export type AcademyAttendanceRiskPlayer = {
  playerId: string;
  playerName: string;
  attendanceRatePct: number;
  lateRatePct: number;
  absentRatePct: number;
  consecutiveAbsences: number;
  riskTypes: AcademyAttendanceRiskType[];
  riskLabels: string[];
  recommendations: string[];
};

export type AcademyAttendanceDigest = {
  headline: string;
  avgAttendanceRatePct: number | null;
  atRiskPlayerCount: number;
  consecutiveAbsencePlayerCount: number;
  guardianFollowUpNeeded: boolean;
  summaryLines: string[];
};

export type AcademyAttendanceAiSummary = {
  paragraphs: string[];
  fullText: string;
};

export type AcademyAttendanceIntelligenceResult = {
  headline: string;
  kpi: AcademyAttendanceKpi;
  atRiskPlayers: AcademyAttendanceRiskPlayer[];
  digest: AcademyAttendanceDigest;
  aiSummary: AcademyAttendanceAiSummary;
  /** 세션 출석 기록 없음 — KPI는 placeholder */
  isEmpty?: boolean;
};
