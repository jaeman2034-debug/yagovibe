/**
 * RC5-2 — Vision Upload Queue types (client)
 */

export type VisionUploadQueueStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type VisionUploadQueueDoc = {
  teamId: string;
  mediaId: string;
  matchId: string | null;
  storagePath: string;
  sizeBytes: number;
  videoHash: string;
  idempotencyKey: string;
  status: VisionUploadQueueStatus;
  runId?: string | null;
  analysisId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  progress?: number | null;
};

export const VISION_UPLOAD_QUEUE_STATUS_LABELS: Record<VisionUploadQueueStatus, string> = {
  uploaded: "업로드 완료",
  queued: "분석 대기",
  processing: "Vision 분석 중",
  completed: "분석 완료",
  failed: "분석 실패",
};

export function mapQueueToPipelineHint(
  status: VisionUploadQueueStatus | null | undefined
): string | null {
  if (!status) return null;
  return VISION_UPLOAD_QUEUE_STATUS_LABELS[status] ?? null;
}
