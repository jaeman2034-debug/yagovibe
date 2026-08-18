/** Sprint G-1.3 — Multi Academy Coach Benchmark */

export type MultiAcademyCoachBenchmarkKpi = {
  academyCount: number;
  totalCoachCount: number;
  totalActiveSessions: number;
  avgAttendanceRecordingRate: number | null;
  avgGrowthContributionRate: number | null;
  avgAtRiskImprovementRate: number | null;
};

export type MultiAcademyCoachBenchmarkRow = {
  teamId: string;
  teamName: string;
  coachCount: number;
  activeSessionCount: number;
  attendanceRecordingRate: number | null;
  growthContributionRate: number | null;
  atRiskImprovementRate: number | null;
};

export type MultiAcademyCoachBenchmarkDigest = {
  headline: string;
  summaryLines: string[];
};

export type MultiAcademyCoachBenchmarkResult = {
  headline: string;
  subline: string | null;
  kpi: MultiAcademyCoachBenchmarkKpi;
  academies: MultiAcademyCoachBenchmarkRow[];
  digest: MultiAcademyCoachBenchmarkDigest;
  isEmpty?: boolean;
};
