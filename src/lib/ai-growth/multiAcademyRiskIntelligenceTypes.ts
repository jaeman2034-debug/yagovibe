/** Sprint G-1.2 — Multi Academy Risk Intelligence */

export type MultiAcademyRiskKpi = {
  academyCount: number;
  avgAtRiskPlayerPct: number | null;
  avgLowAttendanceSessionPct: number | null;
  avgUnrecordedSessionPct: number | null;
};

export type MultiAcademyRiskRow = {
  teamId: string;
  teamName: string;
  atRiskPlayerPct: number | null;
  lowAttendanceSessionPct: number | null;
  unrecordedSessionPct: number | null;
};

export type MultiAcademyRiskDigest = {
  headline: string;
  summaryLines: string[];
};

export type MultiAcademyRiskIntelligenceResult = {
  headline: string;
  subline: string | null;
  kpi: MultiAcademyRiskKpi;
  academies: MultiAcademyRiskRow[];
  digest: MultiAcademyRiskDigest;
  isEmpty?: boolean;
};
