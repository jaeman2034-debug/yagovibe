/** CV-1 I4 — client types (mirror functions/src/lib/academyCvTypes.ts) */

export type CvRoiV1 = {
  x: number;
  y: number;
  w: number;
  h: number;
  frameIndex: number;
  coordinateSpace: "normalized_0_1";
};

export type CvConfidenceBreakdown = {
  roiQuality: number;
  flowStability: number;
  visibilityRatio: number;
};

export type CvCallableStatus = "ok" | "warning" | "failed";

export type CvWarningCode = "LOW_VISIBILITY";

export type CvReviewStatus = "candidate" | "approved" | "rejected";

export type CvReviewDecision = "approved" | "rejected";

export type AcademyCvAnalyzeCallableResult = {
  status: CvCallableStatus;
  failSafe: true;
  teamId: string;
  mediaId: string;
  playerId?: string;
  runId?: string;
  roiVersion?: number;
  reviewStatus?: CvReviewStatus;
  warningCode?: CvWarningCode;
  errorCode?: string;
  message?: string;
  sessionConfidence?: number;
  confidenceBreakdown?: CvConfidenceBreakdown;
};

export type ReviewAcademyCvRunPayload = {
  teamId: string;
  mediaId: string;
  runId: string;
  decision: CvReviewDecision;
};

export type ReviewAcademyCvRunResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  runId: string;
  reviewStatus: CvReviewStatus;
  reviewedBy: string;
  reviewedAt: string;
};

export type GetAcademyCvRunsContextPayload = {
  teamId: string;
  mediaId: string;
};

export type AcademyCvRunSnapshotDto = {
  runId: string;
  roiVersion: number;
  analysisStatus: string;
  reviewStatus?: CvReviewStatus;
  callableStatus?: string;
  sessionConfidence?: number;
  visibilityRatio?: number;
  reviewedBy?: string;
  reviewedAt?: string;
  processedAt?: string;
};

export type GetAcademyCvRunsContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  media: {
    cvRoiVersion?: number;
    cvActiveRunId?: string;
    cvStatus?: string;
  } | null;
  activeRun: AcademyCvRunSnapshotDto | null;
  runs: AcademyCvRunSnapshotDto[];
  previousRun: AcademyCvRunSnapshotDto | null;
};

export const CV_ROI_MIN_AREA = 0.02;
export const CV_ROI_MAX_AREA = 0.6;

export function isCvRoiAreaValid(roi: Pick<CvRoiV1, "w" | "h">): boolean {
  const area = roi.w * roi.h;
  return area >= CV_ROI_MIN_AREA && area <= CV_ROI_MAX_AREA;
}

export function isCvRoiInBounds(roi: Pick<CvRoiV1, "x" | "y" | "w" | "h">): boolean {
  return roi.x >= 0 && roi.y >= 0 && roi.x + roi.w <= 1.001 && roi.y + roi.h <= 1.001;
}
