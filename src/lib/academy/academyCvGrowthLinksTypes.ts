/** CV-1 I7 J5 — client DTO (mirrors functions cvSignalTypes) */

export type CvSignalKey =
  | "VISIBILITY_RATIO"
  | "SESSION_CONFIDENCE"
  | "ROI_QUALITY"
  | "FLOW_STABILITY"
  | "MOVEMENT_CONSISTENCY"
  | "TRACKING_COVERAGE"
  | "PHYSICAL_ACTIVITY_INDEX"
  | "PHYSICAL_RELATIVE_DISTANCE"
  | "PHYSICAL_HIGH_INTENSITY_RUNS";

export type CvSignalDto = {
  key: CvSignalKey;
  value: number;
  unit: string;
  source: "cv_layer";
  provenance: "measured";
};

export type CvGrowthLinkReviewStatus = "candidate" | "accepted" | "rejected";

export type CvGrowthLinkReviewDecision = "accepted" | "rejected";

export type CvGrowthLinkSnapshotDto = {
  linkId: string;
  cvRunId: string;
  roiVersion: number;
  kind: string;
  status: string;
  provenance: string;
  signalCount: number;
  signals: CvSignalDto[];
  extractedAt?: string;
  createdAt?: string;
  createdBy?: string;
  reviewStatus?: CvGrowthLinkReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
};

export type GetCvGrowthLinksContextPayload = {
  teamId: string;
  mediaId: string;
};

export type GetCvGrowthLinksContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  latestLink: CvGrowthLinkSnapshotDto | null;
  signals: CvSignalDto[];
  history: CvGrowthLinkSnapshotDto[];
};

export type ReviewCvGrowthLinkPayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
  decision: CvGrowthLinkReviewDecision;
};

export type ReviewCvGrowthLinkResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  reviewStatus: "accepted" | "rejected";
  reviewedBy: string;
  reviewedAt: string;
};
