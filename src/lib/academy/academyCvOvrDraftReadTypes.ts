/** CV-1 I10-1 — client DTO (ovrDraft preview) */

export type OvrV1AxisKeyDto = "spatial" | "vision" | "decision" | "pressure" | "tactics";

export type OvrAxisScoresDto = Partial<Record<OvrV1AxisKeyDto, number>>;

export type OvrDraftStatusDto = "draft";

export type OvrDraftValidationStatusDto = "pending" | "validated" | "rejected";

export type OvrDraftValidationDecisionDto = "validated" | "rejected";

export type OvrDraftSnapshotDto = {
  draftId: string;
  teamId: string;
  mediaId: string;
  linkId: string;
  fiiDraftId: string;
  sourceSignalIds: string[];
  ovrRuleVersion: string;
  fiiEngineVersion: string;
  promotionRuleVersion: string;
  status: OvrDraftStatusDto;
  axisScores: OvrAxisScoresDto;
  ovr: number;
  validationStatus: OvrDraftValidationStatusDto;
  validationRuleVersion?: string;
  validatedBy?: string;
  validatedAt?: string;
  coachNote?: string;
  provenance: "computed_from_fii_draft";
  createdBy?: string;
  createdAt?: string;
};

export type GetCvOvrDraftPreviewContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvOvrDraftPreviewContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  ovrRuleVersion: string;
  fiiEngineVersion: string;
  promotionRuleVersion: string;
  drafts: OvrDraftSnapshotDto[];
};

export type OvrDraftCompareEntryKindDto = "match" | "missing" | "extra" | "changed";

export type OvrDraftCompareEntryDto = {
  kind: OvrDraftCompareEntryKindDto;
  key: string;
  draftId?: string;
  persistedOvr?: number;
  simulatedOvr?: number;
};

export type OvrDraftCompareSummaryDto = {
  match: number;
  missing: number;
  extra: number;
  changed: number;
  totalPersisted: number;
  totalSimulated: number;
};

export type OvrDraftCompareResultDto = {
  entries: OvrDraftCompareEntryDto[];
  summary: OvrDraftCompareSummaryDto;
};

export type GetCvOvrDraftCompareContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvOvrDraftCompareContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  ovrRuleVersion: string;
  fiiEngineVersion: string;
  promotionRuleVersion: string;
  compare: OvrDraftCompareResultDto | null;
};

export type ReviewOvrDraftPayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
  draftId: string;
  decision: OvrDraftValidationDecisionDto;
  coachNote?: string;
};

export type ReviewOvrDraftResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  draftId: string;
  validationStatus: "validated" | "rejected";
  validatedBy: string;
  validatedAt: string;
  coachNote?: string;
};
