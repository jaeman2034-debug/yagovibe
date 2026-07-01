/** CV-1 I11-3-1 — client DTO (avatarPromotionPreview) */

export type AvatarPromotionPreviewSourceDto = "cv_avatar_promotion";

export type AvatarPromotionPreviewStatusDto = "preview" | "promoted";

export type AvatarPromotionPreviewValidationStatusDto = "pending" | "validated" | "rejected";

export type AvatarPromotionPreviewValidationDecisionDto = "validated" | "rejected";

export type AvatarTierDto = "starter" | "bronze" | "silver" | "gold" | "elite";

export type GrowthBadgeIdDto =
  | "vision_reader"
  | "pressure_breaker"
  | "recovery_runner"
  | "playmaker"
  | "field_commander"
  | "transition_master"
  | "consistency_star";

export type CurrentAvatarSoTSnapshotDto = {
  playerId: string;
  level: number;
  tier: AvatarTierDto;
  ovr: number;
  vision: number;
  pressure: number;
  recovery: number;
  badges: GrowthBadgeIdDto[];
};

export type AvatarPromotionCompareSummaryDto = {
  match: number;
  missing: number;
  extra: number;
  changed: number;
  noSot: number;
};

export type AvatarPromotionPreviewSnapshotDto = {
  previewId: string;
  teamId: string;
  mediaId: string;
  linkId: string;
  playerId: string;
  source: AvatarPromotionPreviewSourceDto;
  avatarDraftId: string;
  avatarRuleVersion: string;
  promotionRuleVersion: string;
  status: AvatarPromotionPreviewStatusDto;
  validationStatus: AvatarPromotionPreviewValidationStatusDto;
  validationRuleVersion?: string;
  validatedBy?: string;
  validatedAt?: string;
  coachNote?: string;
  proposedLevel: number;
  proposedTier: AvatarTierDto;
  proposedOvr: number;
  proposedVision: number;
  proposedPressure: number;
  proposedRecovery: number;
  proposedBadges: GrowthBadgeIdDto[];
  inputOvrSource: string;
  sourceOvrAppliedAt: number;
  promotionAuditId?: string;
  promotedBy?: string;
  promotedAt?: string;
  promotionWriteRuleVersion?: string;
  currentAvatarSnapshot: CurrentAvatarSoTSnapshotDto | null;
  compareSummary: AvatarPromotionCompareSummaryDto;
  provenance: "mapped_from_validated_avatar_draft";
  createdBy?: string;
  createdAt?: string;
};

export type GetCvAvatarPromotionPreviewContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvAvatarPromotionPreviewContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  promotionRuleVersion: string;
  previews: AvatarPromotionPreviewSnapshotDto[];
};

export type AvatarPromotionPreviewCompareEntryKindDto =
  | "match"
  | "missing"
  | "extra"
  | "changed"
  | "no_sot";

export type AvatarPromotionPreviewCompareEntryDto = {
  kind: AvatarPromotionPreviewCompareEntryKindDto;
  key: string;
  proposed?: string | number;
  current?: string | number;
};

export type AvatarPromotionPreviewCompareResultDto = {
  entries: AvatarPromotionPreviewCompareEntryDto[];
  summary: AvatarPromotionCompareSummaryDto;
  currentAvatar: CurrentAvatarSoTSnapshotDto | null;
};

export type GetCvAvatarPromotionPreviewCompareContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvAvatarPromotionPreviewCompareContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  promotionRuleVersion: string;
  compare: AvatarPromotionPreviewCompareResultDto | null;
};

export type ReviewAvatarPromotionPreviewPayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
  previewId: string;
  decision: AvatarPromotionPreviewValidationDecisionDto;
  coachNote?: string;
};

export type ReviewAvatarPromotionPreviewResult = {
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

export type PromoteCvGrowthToPlayerAvatarPayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
  previewId: string;
};

export type PromoteCvGrowthToPlayerAvatarResult = {
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
