/** Sprint H-1.2 — Federation Risk Intelligence */

export type FederationRiskKpi = {
  federationCount: number;
  avgAtRiskPlayerPct: number | null;
  avgLowAttendanceSessionPct: number | null;
  avgUnrecordedSessionPct: number | null;
};

export type FederationRiskRow = {
  federationId: string;
  federationName: string;
  atRiskPlayerPct: number | null;
  lowAttendanceSessionPct: number | null;
  unrecordedSessionPct: number | null;
};

export type FederationRiskDigest = {
  headline: string;
  summaryLines: string[];
};

export type FederationRiskIntelligenceResult = {
  headline: string;
  subline: string | null;
  kpi: FederationRiskKpi;
  federations: FederationRiskRow[];
  digest: FederationRiskDigest;
  isEmpty?: boolean;
};
