/** Sprint F-2.2 — Academy Session Intelligence */

export type AcademySessionStatusSummary = {
  scheduled: number;
  open: number;
  closed: number;
  cancelled: number;
};

export type AcademySessionKpi = {
  totalSessions: number;
  activeSessions: number;
  cancelledSessions: number;
  avgSessionAttendanceRatePct: number | null;
  lowAttendanceSessionCount: number;
  unrecordedSessionCount: number;
};

export type AcademySessionRowSummary = {
  sessionId: string;
  title: string;
  weekLabel: string;
  status: string;
  attendanceRatePct: number | null;
  recordedCount: number;
  rosterCount: number;
};

export type AcademySessionDigest = {
  headline: string;
  summaryLines: string[];
};

export type AcademySessionAiSummary = {
  paragraphs: string[];
  fullText: string;
};

export type AcademySessionIntelligenceResult = {
  headline: string;
  kpi: AcademySessionKpi;
  statusSummary: AcademySessionStatusSummary;
  recentSessions: AcademySessionRowSummary[];
  digest: AcademySessionDigest;
  aiSummary: AcademySessionAiSummary;
  isEmpty?: boolean;
};
