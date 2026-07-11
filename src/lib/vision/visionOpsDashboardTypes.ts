/** Pilot Operations Dashboard — read-only aggregate types */

export type VisionOpsReadinessGrades = Record<"A" | "B" | "C" | "D" | "F" | "unknown", number>;

export type VisionOpsFailureBreakdown = {
  operational: number;
  algorithm: number;
  input_quality: number;
  none: number;
};

export type VisionOpsShadowGate = {
  id: string;
  target: number;
  current: number;
  pass: boolean;
};

export type VisionOpsRunSummary = {
  mediaId: string;
  runId: string;
  status: string;
  gevStatus?: string | null;
  gevEventCount?: number | null;
  visionReadinessScore?: number | null;
  visionReadinessGrade?: string | null;
  failureCategory: string | null;
};

export type VisionOpsDashboardData = {
  teamId: string;
  collectedAt: string;
  loadMs: number;
  preset: string;

  overview: {
    uploadCount: number;
    completedAnalyses: number;
    failedAnalyses: number;
    rawSuccessRate: number;
    productionSuccessRate: number;
    productionAttempted: number;
  };

  quality: {
    avgReadiness: number | null;
    gradeDistribution: VisionOpsReadinessGrades;
    gevGatePassRate: number | null;
    runsWithScore: number;
  };

  gev: {
    runsWithEvents: number;
    totalEvents: number;
    distribution: Record<string, number>;
    pendingReview: number;
  };

  coach: {
    approved: number;
    rejected: number;
    pending: number;
    approvalRateReviewed: number | null;
    avgReviewLatencyHours: number | null;
    bySource: {
      gevEventCandidates: { approved: number; rejected: number; pending: number };
      cvRuns: { approved: number; rejected: number; pending: number };
      interpretationCandidates: { approved: number; rejected: number; pending: number };
    };
  };

  shadow: {
    approvedSamples: number;
    registryVersions: number;
    latestDatasetVersion: string | null;
    latestSampleCount: number;
    eventDistribution: Record<string, number>;
    gates: VisionOpsShadowGate[];
  };

  operations: {
    medianProcessingMin: number | null;
    p95ProcessingMin: number | null;
    errorRate: number | null;
    retryRate: number | null;
    failureBreakdown: VisionOpsFailureBreakdown;
    topIssues: Array<{ label: string; count: number }>;
  };

  recentRuns: VisionOpsRunSummary[];
};
