/** Sprint G-1.4 — Multi Academy Operations Benchmark */

export type MultiAcademyOperationsBenchmarkKpi = {
  academyCount: number;
  avgAttendanceRatePct: number | null;
  avgSessionOperationRate: number | null;
  avgUnrecordedRatePct: number | null;
  avgAtRiskPlayerPct: number | null;
  avgActiveCoachRatio: number | null;
  avgOperationalHealthScore: number | null;
};

export type MultiAcademyOperationsBenchmarkRow = {
  teamId: string;
  teamName: string;
  rank: number;
  attendanceRatePct: number | null;
  sessionOperationRate: number | null;
  unrecordedRatePct: number | null;
  atRiskPlayerPct: number | null;
  activeCoachRatio: number | null;
  operationalHealthScore: number | null;
};

export type MultiAcademyOperationsBenchmarkDigest = {
  headline: string;
  summaryLines: string[];
};

export type MultiAcademyOperationsBenchmarkResult = {
  headline: string;
  subline: string | null;
  kpi: MultiAcademyOperationsBenchmarkKpi;
  academies: MultiAcademyOperationsBenchmarkRow[];
  digest: MultiAcademyOperationsBenchmarkDigest;
  isEmpty?: boolean;
};
