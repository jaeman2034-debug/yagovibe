/** CV-1 I9-1 / I9-2 — client DTO (growthSignals draft preview + validation) */

export type GrowthSignalTypeDto =
  | "awareness_signal"
  | "decision_signal"
  | "transition_signal"
  | "positioning_signal"
  | "recovery_signal"
  | "intensity_signal";

export type GrowthSignalStatusDto = "draft";

export type GrowthSignalValidationStatusDto = "pending" | "validated" | "rejected";

export type GrowthSignalValidationDecisionDto = "validated" | "rejected";

export type GrowthSignalSnapshotDto = {
  signalId: string;
  teamId: string;
  mediaId: string;
  linkId: string;
  signalType: GrowthSignalTypeDto;
  sourceCandidateIds: string[];
  confidence: number;
  mappingRuleVersion: string;
  status: GrowthSignalStatusDto;
  validationStatus: GrowthSignalValidationStatusDto;
  validationRuleVersion?: string;
  provenance: "mapped_from_interpretation";
  createdBy?: string;
  createdAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  coachNote?: string;
};

export type GetCvGrowthSignalsPreviewContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvGrowthSignalsPreviewContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  mappingRuleVersion: string;
  signals: GrowthSignalSnapshotDto[];
};

export type ReviewGrowthSignalDraftPayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
  signalId: string;
  decision: GrowthSignalValidationDecisionDto;
  coachNote?: string;
};

export type ReviewGrowthSignalDraftResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  signalId: string;
  validationStatus: "validated" | "rejected";
  validatedBy: string;
  validatedAt: string;
  coachNote?: string;
};

export type GrowthSignalCompareEntryKindDto = "match" | "missing" | "extra" | "changed";

export type GrowthSignalCompareEntryDto = {
  kind: GrowthSignalCompareEntryKindDto;
  key: string;
  signalType: string;
  sourceCandidateIds: string[];
  persistedConfidence?: number;
  simulatedConfidence?: number;
  signalId?: string;
};

export type GrowthSignalCompareSummaryDto = {
  match: number;
  missing: number;
  extra: number;
  changed: number;
  totalPersisted: number;
  totalSimulated: number;
};

export type GrowthSignalCompareResultDto = {
  entries: GrowthSignalCompareEntryDto[];
  summary: GrowthSignalCompareSummaryDto;
};

export type GetCvGrowthSignalsCompareContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvGrowthSignalsCompareContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  mappingRuleVersion: string;
  compare: GrowthSignalCompareResultDto | null;
};
