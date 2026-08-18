/** Sprint H-1.4 — Federation Operations Benchmark */

export type FederationOperationsBenchmarkKpi = {
  federationCount: number;
  avgAttendanceRatePct: number | null;
  avgSessionOperationRate: number | null;
  avgUnrecordedRatePct: number | null;
  avgAtRiskPlayerPct: number | null;
  avgOperationalHealthScore: number | null;
};

export type FederationOperationsBenchmarkRow = {
  federationId: string;
  federationName: string;
  rank: number;
  attendanceRatePct: number | null;
  sessionOperationRate: number | null;
  unrecordedRatePct: number | null;
  atRiskPlayerPct: number | null;
  operationalHealthScore: number | null;
};

export type FederationOperationsBenchmarkDigest = {
  headline: string;
  summaryLines: string[];
};

export type FederationOperationsBenchmarkResult = {
  headline: string;
  subline: string | null;
  kpi: FederationOperationsBenchmarkKpi;
  federations: FederationOperationsBenchmarkRow[];
  digest: FederationOperationsBenchmarkDigest;
  isEmpty?: boolean;
};
