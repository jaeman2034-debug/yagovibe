/**
 * Vision v6-7 — pipeline status types (client)
 */

export type VisionRunStatus =
  | "queued"
  | "retrying"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type VisionPipelineUiStatus =
  | "none"
  | "uploading"
  | "queued"
  | "retrying"
  | "analyzing"
  | "completed"
  | "failed"
  | "cancelled";

export type VisionPipelineStep =
  | "upload"
  | "queued"
  | "tracking"
  | "gev"
  | "fii"
  | "persist"
  | "done";

export type VisionMatchIndexDoc = {
  teamId: string;
  matchId: string;
  mediaId: string | null;
  runId: string | null;
  analysisId: string | null;
  latestRunId?: string | null;
  latestAnalysisId?: string | null;
  hasVision?: boolean;
  progress?: number | null;
  status: VisionRunStatus | "uploading" | "none";
  pipelineStep?: VisionPipelineStep | null;
  productionPreset?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  analysisCompletedAt?: unknown;
};

export const VISION_PIPELINE_STEP_LABELS: Record<VisionPipelineStep, string> = {
  upload: "업로드",
  queued: "대기",
  tracking: "Tracking",
  gev: "GEV",
  fii: "FII",
  persist: "저장",
  done: "완료",
};

export const VISION_PIPELINE_STATUS_LABELS: Record<VisionPipelineUiStatus, string> = {
  none: "분석 없음",
  uploading: "업로드 중",
  queued: "대기 중",
  retrying: "재시도 중",
  analyzing: "분석 중",
  completed: "완료",
  failed: "실패",
  cancelled: "취소됨",
};

export function mapVisionIndexToUiStatus(
  raw: string | null | undefined
): VisionPipelineUiStatus {
  switch (raw) {
    case "uploading":
      return "uploading";
    case "queued":
      return "queued";
    case "retrying":
      return "retrying";
    case "processing":
      return "analyzing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "none";
  }
}
