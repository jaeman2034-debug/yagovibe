/** CV-1 I8-1 — client DTO (mirrors functions interpretationCandidateTypes) */

export type InterpretationCandidateType = "quality" | "movement" | "physical";

export type InterpretationCandidateStatus = "candidate";

export type InterpretationCandidateReviewStatus = "candidate" | "approved" | "rejected";

export type InterpretationCandidateReviewDecision = "approved" | "rejected";

export type InterpretationCandidateSourceSignalDto = {
  key: string;
  value: number;
};

export type InterpretationCandidateSnapshotDto = {
  candidateId: string;
  teamId: string;
  mediaId: string;
  linkId: string;
  cvRunId: string;
  candidateType: InterpretationCandidateType;
  sourceSignals: InterpretationCandidateSourceSignalDto[];
  confidence: number;
  status: InterpretationCandidateStatus;
  reviewStatus?: InterpretationCandidateReviewStatus;
  provenance: "measured_to_candidate";
  createdBy?: string;
  createdAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  coachNote?: string;
};

export type ReviewInterpretationCandidatePayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
  candidateId: string;
  decision: InterpretationCandidateReviewDecision;
  coachNote?: string;
};

export type ReviewInterpretationCandidateResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  candidateId: string;
  reviewStatus: "approved" | "rejected";
  reviewedBy: string;
  reviewedAt: string;
  coachNote?: string;
};

export type GetCvInterpretationPreviewContextPayload = {
  teamId: string;
  mediaId: string;
  linkId?: string;
};

export type GetCvInterpretationPreviewContextResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string | null;
  reviewStatus: string | null;
  candidates: InterpretationCandidateSnapshotDto[];
};
