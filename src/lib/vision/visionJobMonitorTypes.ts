/**
 * RC5-3 — Vision Job Monitor types (client)
 */

import type {
  VisionPipelineStep,
  VisionPipelineUiStatus,
  VisionRunStatus,
} from "@/lib/vision/visionRunTypes";
import type { VisionUploadQueueStatus } from "@/lib/vision/visionUploadQueueTypes";

export const VISION_JOB_PIPELINE_STEPS: VisionPipelineStep[] = [
  "upload",
  "queued",
  "tracking",
  "gev",
  "fii",
  "persist",
  "done",
];

export const VISION_PIPELINE_STEP_PROGRESS: Record<VisionPipelineStep, number> = {
  upload: 5,
  queued: 10,
  tracking: 25,
  gev: 50,
  fii: 75,
  persist: 90,
  done: 100,
};

export type VisionJobMonitorRunDoc = {
  runId: string;
  status: VisionRunStatus;
  pipelineStep: VisionPipelineStep | null;
  progress: number | null;
  retryCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: unknown;
  updatedAt: unknown;
  completedAt: unknown;
  createdAt: unknown;
};

export type VisionJobMonitorState = {
  loading: boolean;
  active: boolean;
  uiStatus: VisionPipelineUiStatus;
  pipelineStep: VisionPipelineStep | null;
  progress: number;
  teamId: string;
  matchId: string;
  mediaId: string | null;
  runId: string | null;
  analysisId: string | null;
  queueStatus: VisionUploadQueueStatus | null;
  retryCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: unknown;
  updatedAt: unknown;
  completedAt: unknown;
  hasRunDoc: boolean;
  hasQueueDoc: boolean;
  hasIndexDoc: boolean;
};

export function stepProgress(step: VisionPipelineStep | null | undefined): number {
  if (!step) return 0;
  return VISION_PIPELINE_STEP_PROGRESS[step] ?? 0;
}

export function stepIndex(step: VisionPipelineStep | null | undefined): number {
  if (!step) return -1;
  return VISION_JOB_PIPELINE_STEPS.indexOf(step);
}

export function mapQueueStatusToUi(
  status: VisionUploadQueueStatus | null
): VisionPipelineUiStatus | null {
  switch (status) {
    case "uploaded":
      return "uploading";
    case "queued":
      return "queued";
    case "processing":
      return "analyzing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

export function formatVisionTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return d.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return null;
    }
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
  }
  return null;
}
