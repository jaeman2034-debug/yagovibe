/** CV-1 I11-1 — client DTO (avatarDraft preview) */

export type AvatarTierDto = "starter" | "bronze" | "silver" | "gold" | "elite";

export type GrowthBadgeIdDto =
  | "vision_reader"
  | "pressure_breaker"
  | "recovery_runner"
  | "playmaker"
  | "field_commander"
  | "transition_master"
  | "consistency_star";

export type AvatarDraftStatusDto = "draft";

export type AvatarDraftValidationStatusDto = "pending" | "validated" | "rejected";

export type AvatarDraftValidationDecisionDto = "validated" | "rejected";

export type AvatarDraftInputOvrSourceDto =
  | "session_sync"
  | "season_apply"
  | "bootstrap"
  | "cv_promotion";

export type AvatarDraftSnapshotDto = {
  draftId: string;
  teamId: string;
  mediaId: string;
  linkId: string;
  playerId: string;
  source: "cv_avatar_draft";
  avatarRuleVersion: string;
  inputOvrSource: AvatarDraftInputOvrSourceDto;
  sourceOvrAppliedAt: number;
  promotionAuditId?: string;
  status: AvatarDraftStatusDto;
  validationStatus: AvatarDraftValidationStatusDto;
  validationRuleVersion?: string;
  validatedBy?: string;
  validatedAt?: string;
  coachNote?: string;
  ovr: number;
  vision: number;
  pressure: number;
  recovery: number;
  level: number;
  tier: AvatarTierDto;
  proposedBadges: GrowthBadgeIdDto[];
  provenance: "mapped_from_player_growth_ovr";
  createdBy?: string;
  createdAt?: string;
};

export type GetCvAvatarDraftPreviewContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvAvatarDraftPreviewContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  avatarRuleVersion: string;
  playerId: string | null;
  drafts: AvatarDraftSnapshotDto[];
};

export type AvatarDraftCompareEntryKindDto = "match" | "missing" | "extra" | "changed";

export type AvatarDraftCompareEntryDto = {
  kind: AvatarDraftCompareEntryKindDto;
  key: string;
  draftId?: string;
  persistedLevel?: number;
  simulatedLevel?: number;
  persistedOvr?: number;
  simulatedOvr?: number;
};

export type AvatarDraftCompareSummaryDto = {
  match: number;
  missing: number;
  extra: number;
  changed: number;
  totalPersisted: number;
  totalSimulated: number;
};

export type AvatarDraftCompareResultDto = {
  entries: AvatarDraftCompareEntryDto[];
  summary: AvatarDraftCompareSummaryDto;
};

export type GetCvAvatarDraftCompareContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvAvatarDraftCompareContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  avatarRuleVersion: string;
  compare: AvatarDraftCompareResultDto | null;
};

export type ReviewAvatarDraftPayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
  draftId: string;
  decision: AvatarDraftValidationDecisionDto;
  coachNote?: string;
};

export type ReviewAvatarDraftResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  draftId: string;
  validationStatus: AvatarDraftValidationStatusDto;
  validatedBy: string;
  validatedAt: string;
  coachNote?: string;
};
