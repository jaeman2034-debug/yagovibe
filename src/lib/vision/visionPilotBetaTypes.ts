/**
 * RC5-4 — Pilot ops log + VOC types
 */

export type VisionPilotOpsLogDoc = {
  id: string;
  teamId: string;
  matchId: string;
  mediaId: string;
  runId: string;
  analysisId: string | null;
  success: boolean;
  idempotent: boolean;
  pipelineElapsedMs: number;
  startedFrom: string;
  errorCode: string | null;
  errorMessage: string | null;
  pipelineStep: string | null;
  productionPreset: string | null;
  recordedAt: unknown;
};

export type VisionPilotVocDoc = {
  id: string;
  persona: "coach" | "parent";
  rating: number;
  comment: string;
  matchId: string;
  submittedBy: string;
  createdAt: unknown;
};

export type VisionPilotOpsSummary = {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgElapsedMs: number;
};

export function summarizePilotOpsLogs(logs: VisionPilotOpsLogDoc[]): VisionPilotOpsSummary {
  const totalRuns = logs.length;
  const successCount = logs.filter((l) => l.success).length;
  const failureCount = totalRuns - successCount;
  const elapsed = logs.map((l) => l.pipelineElapsedMs).filter((n) => n > 0);
  const avgElapsedMs =
    elapsed.length > 0 ? Math.round(elapsed.reduce((a, b) => a + b, 0) / elapsed.length) : 0;
  return {
    totalRuns,
    successCount,
    failureCount,
    successRate: totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0,
    avgElapsedMs,
  };
}
