/** Sprint F-2.3 — Academy Coach Operations Intelligence */

export type AcademyCoachOperationsKpi = {
  coachCount: number;
  totalSessions: number;
  avgAttendanceManagementRate: number;
  avgAtRiskManagementRate: number;
};

export type AcademyCoachOperationsRow = {
  coachId: string;
  coachLabel: string;
  sessionCount: number;
  attendanceManagementRate: number;
  avgSessionAttendanceRatePct: number | null;
  atRiskPlayerCount: number;
  atRiskManagementRate: number;
  unrecordedSessionCount: number;
};

export type AcademyCoachOperationsDigest = {
  headline: string;
  summaryLines: string[];
};

export type AcademyCoachOperationsAiSummary = {
  paragraphs: string[];
  fullText: string;
};

export type AcademyCoachOperationsResult = {
  headline: string;
  kpi: AcademyCoachOperationsKpi;
  coaches: AcademyCoachOperationsRow[];
  digest: AcademyCoachOperationsDigest;
  aiSummary: AcademyCoachOperationsAiSummary;
  isEmpty?: boolean;
};
