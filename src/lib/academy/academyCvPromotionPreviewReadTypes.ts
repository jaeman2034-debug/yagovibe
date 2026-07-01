/** CV-1 I10-3-1 — client DTO (promotionPreview) */

export type PromotionPreviewSourceDto = "cv_promotion";

export type PromotionPreviewStatusDto = "preview" | "promoted";

export type PromotionPreviewValidationStatusDto = "pending" | "validated" | "rejected";

export type PromotionPreviewValidationDecisionDto = "validated" | "rejected";

export type PromotionPreviewAxisScoresDto = Partial<
  Record<"spatial" | "vision" | "decision" | "pressure" | "tactics", number>
>;

export type PromotionPreviewSnapshotDto = {
  previewId: string;
  teamId: string;
  mediaId: string;
  linkId: string;
  source: PromotionPreviewSourceDto;
  ovrDraftId: string;
  fiiDraftId: string;
  sourceSignalIds: string[];
  promotionRuleVersion: string;
  status: PromotionPreviewStatusDto;
  inputAxisScores: PromotionPreviewAxisScoresDto;
  ovrDraftOvr: number;
  proposedVision?: number;
  proposedPressure?: number;
  proposedRecovery?: number;
  proposedOvr: number;
  mappingNotes: string[];
  validationStatus: PromotionPreviewValidationStatusDto;
  validationRuleVersion?: string;
  validatedBy?: string;
  validatedAt?: string;
  coachNote?: string;
  promotionAuditId?: string;
  promotedBy?: string;
  promotedAt?: string;
  promotionWriteRuleVersion?: string;
  provenance: "mapped_from_validated_ovr_draft";
  createdBy?: string;
  createdAt?: string;
};

export type GetCvPromotionPreviewContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvPromotionPreviewContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  promotionRuleVersion: string;
  previews: PromotionPreviewSnapshotDto[];
};

export type CurrentSoTSnapshotDto = {
  playerId: string;
  ovr: number;
  vision: number;
  pressure: number;
  recovery: number;
  source?: string;
};

export type PromotionPreviewCompareEntryKindDto =
  | "match"
  | "missing"
  | "extra"
  | "changed"
  | "no_sot";

export type PromotionPreviewCompareEntryDto = {
  kind: PromotionPreviewCompareEntryKindDto;
  key: string;
  proposed?: number;
  current?: number;
};

export type PromotionPreviewCompareSummaryDto = {
  match: number;
  missing: number;
  extra: number;
  changed: number;
  noSot: number;
};

export type PromotionPreviewCompareResultDto = {
  entries: PromotionPreviewCompareEntryDto[];
  summary: PromotionPreviewCompareSummaryDto;
  currentSoT: CurrentSoTSnapshotDto | null;
};

export type GetCvPromotionPreviewCompareContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvPromotionPreviewCompareContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  promotionRuleVersion: string;
  compare: PromotionPreviewCompareResultDto | null;
};

export type ReviewPromotionPreviewPayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
  previewId: string;
  decision: PromotionPreviewValidationDecisionDto;
  coachNote?: string;
};

export type ReviewPromotionPreviewResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  previewId: string;
  validationStatus: "validated" | "rejected";
  validatedBy: string;
  validatedAt: string;
  coachNote?: string;
};

export type PromoteCvGrowthToPlayerOvrPayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
  previewId: string;
};

export type PromoteCvGrowthToPlayerOvrResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  previewId: string;
  auditId: string;
  playerId: string;
  beforeExists: boolean;
  beforeOvr: number;
  afterOvr: number;
  promotedBy: string;
  promotedAt: string;
};
