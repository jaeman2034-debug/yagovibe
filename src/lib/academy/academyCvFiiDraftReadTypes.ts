/** CV-1 I9-3 — client DTO (fiiDraft FII preview) */

export type FiiV1AxisKeyDto = "spatial" | "vision" | "decision" | "pressure" | "tactics";

export type FiiAxisContributionDto = {
  axis: FiiV1AxisKeyDto;
  signalType: string;
  sourceSignalId: string;
  confidence: number;
  proxy?: boolean;
  sourceSignalType?: string;
};

export type FiiDraftStatusDto = "draft";

export type FiiDraftSnapshotDto = {
  draftId: string;
  teamId: string;
  mediaId: string;
  linkId: string;
  sourceSignalIds: string[];
  promotionRuleVersion: string;
  fiiEngineVersion: string;
  status: FiiDraftStatusDto;
  axisContributions: FiiAxisContributionDto[];
  overallPreview: number | null;
  provenance: "promoted_from_growth_signals";
  createdBy?: string;
  createdAt?: string;
};

export type GetCvFiiDraftPreviewContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvFiiDraftPreviewContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  promotionRuleVersion: string;
  fiiEngineVersion: string;
  drafts: FiiDraftSnapshotDto[];
};

export type FiiDraftCompareEntryKindDto = "match" | "missing" | "extra" | "changed";

export type FiiDraftCompareEntryDto = {
  kind: FiiDraftCompareEntryKindDto;
  key: string;
  draftId?: string;
  persistedOverall?: number | null;
  simulatedOverall?: number | null;
};

export type FiiDraftCompareSummaryDto = {
  match: number;
  missing: number;
  extra: number;
  changed: number;
  totalPersisted: number;
  totalSimulated: number;
};

export type FiiDraftCompareResultDto = {
  entries: FiiDraftCompareEntryDto[];
  summary: FiiDraftCompareSummaryDto;
};

export type GetCvFiiDraftCompareContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvFiiDraftCompareContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  promotionRuleVersion: string;
  fiiEngineVersion: string;
  compare: FiiDraftCompareResultDto | null;
};
