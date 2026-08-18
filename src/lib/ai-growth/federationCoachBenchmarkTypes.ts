/** Sprint H-1.3 — Federation Coach Benchmark */

export type FederationCoachBenchmarkKpi = {
  federationCount: number;
  totalCoachCount: number;
  totalActiveSessions: number;
  avgAttendanceRecordingRate: number | null;
  avgGrowthContributionRate: number | null;
  avgAtRiskImprovementRate: number | null;
};

export type FederationCoachBenchmarkRow = {
  federationId: string;
  federationName: string;
  coachCount: number;
  activeSessionCount: number;
  attendanceRecordingRate: number | null;
  growthContributionRate: number | null;
  atRiskImprovementRate: number | null;
};

export type FederationCoachBenchmarkDigest = {
  headline: string;
  summaryLines: string[];
};

export type FederationCoachBenchmarkResult = {
  headline: string;
  subline: string | null;
  kpi: FederationCoachBenchmarkKpi;
  federations: FederationCoachBenchmarkRow[];
  digest: FederationCoachBenchmarkDigest;
  isEmpty?: boolean;
};
