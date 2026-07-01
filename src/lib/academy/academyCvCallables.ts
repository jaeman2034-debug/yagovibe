import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type {
  AcademyCvAnalyzeCallableResult,
  CvRoiV1,
  GetAcademyCvRunsContextPayload,
  GetAcademyCvRunsContextResult,
  ReviewAcademyCvRunPayload,
  ReviewAcademyCvRunResult,
} from "@/lib/academy/academyCvTypes";
import type {
  GetCvGrowthLinksContextPayload,
  GetCvGrowthLinksContextResult,
  ReviewCvGrowthLinkPayload,
  ReviewCvGrowthLinkResult,
} from "@/lib/academy/academyCvGrowthLinksTypes";
import type {
  GetCvInterpretationPreviewContextPayload,
  GetCvInterpretationPreviewContextResult,
  ReviewInterpretationCandidatePayload,
  ReviewInterpretationCandidateResult,
} from "@/lib/academy/academyCvInterpretationReadTypes";
import type {
  GetCvGrowthSignalsCompareContextPayload,
  GetCvGrowthSignalsCompareContextResult,
  GetCvGrowthSignalsPreviewContextPayload,
  GetCvGrowthSignalsPreviewContextResult,
  ReviewGrowthSignalDraftPayload,
  ReviewGrowthSignalDraftResult,
} from "@/lib/academy/academyCvGrowthSignalsReadTypes";
import type {
  GetCvFiiDraftCompareContextPayload,
  GetCvFiiDraftCompareContextResult,
  GetCvFiiDraftPreviewContextPayload,
  GetCvFiiDraftPreviewContextResult,
} from "@/lib/academy/academyCvFiiDraftReadTypes";
import type {
  GetCvOvrDraftCompareContextPayload,
  GetCvOvrDraftCompareContextResult,
  GetCvOvrDraftPreviewContextPayload,
  GetCvOvrDraftPreviewContextResult,
  ReviewOvrDraftPayload,
  ReviewOvrDraftResult,
} from "@/lib/academy/academyCvOvrDraftReadTypes";
import type {
  GetCvAvatarDraftPreviewContextPayload,
  GetCvAvatarDraftPreviewContextResult,
  GetCvAvatarDraftCompareContextPayload,
  GetCvAvatarDraftCompareContextResult,
  ReviewAvatarDraftPayload,
  ReviewAvatarDraftResult,
} from "@/lib/academy/academyCvAvatarDraftReadTypes";
import type {
  GetCvAvatarPromotionPreviewCompareContextPayload,
  GetCvAvatarPromotionPreviewCompareContextResult,
  GetCvAvatarPromotionPreviewContextPayload,
  GetCvAvatarPromotionPreviewContextResult,
  ReviewAvatarPromotionPreviewPayload,
  ReviewAvatarPromotionPreviewResult,
  PromoteCvGrowthToPlayerAvatarPayload,
  PromoteCvGrowthToPlayerAvatarResult,
} from "@/lib/academy/academyCvAvatarPromotionPreviewReadTypes";
import type {
  GetCvPromotionPreviewCompareContextPayload,
  GetCvPromotionPreviewCompareContextResult,
  GetCvPromotionPreviewContextPayload,
  GetCvPromotionPreviewContextResult,
  ReviewPromotionPreviewPayload,
  ReviewPromotionPreviewResult,
  PromoteCvGrowthToPlayerOvrPayload,
  PromoteCvGrowthToPlayerOvrResult,
} from "@/lib/academy/academyCvPromotionPreviewReadTypes";

const CV_ANALYSIS_CALLABLE_TIMEOUT_MS = 180_000;

export type StartAcademyCvAnalysisPayload = {
  teamId: string;
  mediaId: string;
  playerId?: string;
  roi: CvRoiV1;
  options?: {
    targetFps?: number;
    maxDurationSec?: number;
  };
};

export function parseAcademyCvAnalysisError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "CV 분석 요청 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callStartAcademyCvAnalysis(
  payload: StartAcademyCvAnalysisPayload
): Promise<AcademyCvAnalyzeCallableResult> {
  console.info("[ACADEMY-CV] startAcademyCvAnalysis", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    playerId: payload.playerId,
    roi: payload.roi,
  });
  const fn = httpsCallable<StartAcademyCvAnalysisPayload, AcademyCvAnalyzeCallableResult>(
    functions,
    "startAcademyCvAnalysis",
    { timeout: CV_ANALYSIS_CALLABLE_TIMEOUT_MS }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] completed", {
    status: res.data.status,
    runId: res.data.runId,
    roiVersion: res.data.roiVersion,
    warningCode: res.data.warningCode,
    errorCode: res.data.errorCode,
  });
  return res.data;
}

export function parseAcademyCvReviewError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "CV 검토 요청 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callReviewAcademyCvRun(
  payload: ReviewAcademyCvRunPayload
): Promise<ReviewAcademyCvRunResult> {
  console.info("[ACADEMY-CV] reviewAcademyCvRun", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    runId: payload.runId,
    decision: payload.decision,
  });
  const fn = httpsCallable<ReviewAcademyCvRunPayload, ReviewAcademyCvRunResult>(
    functions,
    "reviewAcademyCvRun",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] review completed", {
    reviewStatus: res.data.reviewStatus,
    reviewedBy: res.data.reviewedBy,
  });
  return res.data;
}

export async function callGetAcademyCvRunsContext(
  payload: GetAcademyCvRunsContextPayload
): Promise<GetAcademyCvRunsContextResult> {
  console.info("[ACADEMY-CV] getAcademyCvRunsContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
  });
  const fn = httpsCallable<GetAcademyCvRunsContextPayload, GetAcademyCvRunsContextResult>(
    functions,
    "getAcademyCvRunsContext",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getAcademyCvRunsContext done", {
    runCount: res.data.runs?.length ?? 0,
    activeRunId: res.data.activeRun?.runId,
  });
  return res.data;
}

export async function callGetCvGrowthLinksContext(
  payload: GetCvGrowthLinksContextPayload
): Promise<GetCvGrowthLinksContextResult> {
  console.info("[ACADEMY-CV] getCvGrowthLinksContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
  });
  const fn = httpsCallable<GetCvGrowthLinksContextPayload, GetCvGrowthLinksContextResult>(
    functions,
    "getCvGrowthLinksContext",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvGrowthLinksContext done", {
    mediaId: payload.mediaId,
    historyCount: res.data.history?.length ?? 0,
    signalCount: res.data.signals?.length ?? 0,
    latestLinkId: res.data.latestLink?.linkId,
  });
  return res.data;
}

export type ExtractApprovedCvSignalsPayload = {
  teamId: string;
  mediaId: string;
  runId?: string;
};

export type ExtractApprovedCvSignalsResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  runId: string;
  linkId: string;
  created: boolean;
  roiVersion: number;
};

/** I7 J3 — approved cvRun → cvSignals → cvGrowthLinks (Callable only) */
export async function callExtractApprovedCvSignals(
  payload: ExtractApprovedCvSignalsPayload
): Promise<ExtractApprovedCvSignalsResult> {
  console.info("[ACADEMY-CV] extractApprovedCvSignals", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    runId: payload.runId,
  });
  const fn = httpsCallable<ExtractApprovedCvSignalsPayload, ExtractApprovedCvSignalsResult>(
    functions,
    "extractApprovedCvSignals",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] extractApprovedCvSignals done", {
    mediaId: payload.mediaId,
    runId: res.data.runId,
    linkId: res.data.linkId,
    created: res.data.created,
  });
  return res.data;
}

export type GenerateInterpretationCandidatesPayload = {
  teamId: string;
  mediaId: string;
  linkId: string;
};

export type GenerateInterpretationCandidatesResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  drafts: number;
  appended: number;
  skipped: number;
};

/** I8-2 — accepted cvGrowthLink → interpretationCandidates */
export async function callGenerateInterpretationCandidates(
  payload: GenerateInterpretationCandidatesPayload
): Promise<GenerateInterpretationCandidatesResult> {
  console.info("[ACADEMY-CV] generateInterpretationCandidates", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GenerateInterpretationCandidatesPayload,
    GenerateInterpretationCandidatesResult
  >(functions, "generateInterpretationCandidates", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] generateInterpretationCandidates done", {
    linkId: res.data.linkId,
    drafts: res.data.drafts,
    appended: res.data.appended,
    skipped: res.data.skipped,
  });
  return res.data;
}

export async function callGetCvInterpretationPreviewContext(
  payload: GetCvInterpretationPreviewContextPayload
): Promise<GetCvInterpretationPreviewContextResult> {
  console.info("[ACADEMY-CV] getCvInterpretationPreviewContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvInterpretationPreviewContextPayload,
    GetCvInterpretationPreviewContextResult
  >(functions, "getCvInterpretationPreviewContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvInterpretationPreviewContext done", {
    linkId: res.data.linkId,
    candidateCount: res.data.candidates?.length ?? 0,
  });
  return res.data;
}

export async function callGetCvGrowthSignalsPreviewContext(
  payload: GetCvGrowthSignalsPreviewContextPayload
): Promise<GetCvGrowthSignalsPreviewContextResult> {
  console.info("[ACADEMY-CV] getCvGrowthSignalsPreviewContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvGrowthSignalsPreviewContextPayload,
    GetCvGrowthSignalsPreviewContextResult
  >(functions, "getCvGrowthSignalsPreviewContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvGrowthSignalsPreviewContext done", {
    linkId: res.data.linkId,
    signalCount: res.data.signals?.length ?? 0,
  });
  return res.data;
}

export function parseGrowthSignalDraftReviewError(error: unknown): {
  code: string;
  message: string;
} {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Growth signal draft 검토 요청 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callReviewGrowthSignalDraft(
  payload: ReviewGrowthSignalDraftPayload
): Promise<ReviewGrowthSignalDraftResult> {
  console.info("[ACADEMY-CV] reviewGrowthSignalDraft", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
    signalId: payload.signalId,
    decision: payload.decision,
  });
  const fn = httpsCallable<ReviewGrowthSignalDraftPayload, ReviewGrowthSignalDraftResult>(
    functions,
    "reviewGrowthSignalDraft",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] reviewGrowthSignalDraft done", {
    validationStatus: res.data.validationStatus,
    validatedBy: res.data.validatedBy,
  });
  return res.data;
}

export async function callGetCvGrowthSignalsCompareContext(
  payload: GetCvGrowthSignalsCompareContextPayload
): Promise<GetCvGrowthSignalsCompareContextResult> {
  console.info("[ACADEMY-CV] getCvGrowthSignalsCompareContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvGrowthSignalsCompareContextPayload,
    GetCvGrowthSignalsCompareContextResult
  >(functions, "getCvGrowthSignalsCompareContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvGrowthSignalsCompareContext done", {
    linkId: res.data.linkId,
    match: res.data.compare?.summary.match ?? 0,
  });
  return res.data;
}

export async function callGetCvFiiDraftPreviewContext(
  payload: GetCvFiiDraftPreviewContextPayload
): Promise<GetCvFiiDraftPreviewContextResult> {
  console.info("[ACADEMY-CV] getCvFiiDraftPreviewContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvFiiDraftPreviewContextPayload,
    GetCvFiiDraftPreviewContextResult
  >(functions, "getCvFiiDraftPreviewContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvFiiDraftPreviewContext done", {
    linkId: res.data.linkId,
    draftCount: res.data.drafts?.length ?? 0,
  });
  return res.data;
}

export async function callGetCvFiiDraftCompareContext(
  payload: GetCvFiiDraftCompareContextPayload
): Promise<GetCvFiiDraftCompareContextResult> {
  console.info("[ACADEMY-CV] getCvFiiDraftCompareContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvFiiDraftCompareContextPayload,
    GetCvFiiDraftCompareContextResult
  >(functions, "getCvFiiDraftCompareContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvFiiDraftCompareContext done", {
    linkId: res.data.linkId,
    match: res.data.compare?.summary.match ?? 0,
  });
  return res.data;
}

export async function callGetCvOvrDraftPreviewContext(
  payload: GetCvOvrDraftPreviewContextPayload
): Promise<GetCvOvrDraftPreviewContextResult> {
  console.info("[ACADEMY-CV] getCvOvrDraftPreviewContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvOvrDraftPreviewContextPayload,
    GetCvOvrDraftPreviewContextResult
  >(functions, "getCvOvrDraftPreviewContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvOvrDraftPreviewContext done", {
    linkId: res.data.linkId,
    draftCount: res.data.drafts?.length ?? 0,
    ovr: res.data.drafts?.[0]?.ovr,
  });
  return res.data;
}

export async function callGetCvOvrDraftCompareContext(
  payload: GetCvOvrDraftCompareContextPayload
): Promise<GetCvOvrDraftCompareContextResult> {
  console.info("[ACADEMY-CV] getCvOvrDraftCompareContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvOvrDraftCompareContextPayload,
    GetCvOvrDraftCompareContextResult
  >(functions, "getCvOvrDraftCompareContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvOvrDraftCompareContext done", {
    linkId: res.data.linkId,
    match: res.data.compare?.summary.match ?? 0,
  });
  return res.data;
}

export async function callGetCvPromotionPreviewContext(
  payload: GetCvPromotionPreviewContextPayload
): Promise<GetCvPromotionPreviewContextResult> {
  console.info("[ACADEMY-CV] getCvPromotionPreviewContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvPromotionPreviewContextPayload,
    GetCvPromotionPreviewContextResult
  >(functions, "getCvPromotionPreviewContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvPromotionPreviewContext done", {
    linkId: res.data.linkId,
    previewCount: res.data.previews?.length ?? 0,
    proposedOvr: res.data.previews?.[0]?.proposedOvr,
  });
  return res.data;
}

export async function callGetCvAvatarDraftPreviewContext(
  payload: GetCvAvatarDraftPreviewContextPayload
): Promise<GetCvAvatarDraftPreviewContextResult> {
  console.info("[ACADEMY-CV] getCvAvatarDraftPreviewContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvAvatarDraftPreviewContextPayload,
    GetCvAvatarDraftPreviewContextResult
  >(functions, "getCvAvatarDraftPreviewContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvAvatarDraftPreviewContext done", {
    linkId: res.data.linkId,
    draftCount: res.data.drafts?.length ?? 0,
    level: res.data.drafts?.[0]?.level,
    tier: res.data.drafts?.[0]?.tier,
  });
  return res.data;
}

export async function callGetCvAvatarDraftCompareContext(
  payload: GetCvAvatarDraftCompareContextPayload
): Promise<GetCvAvatarDraftCompareContextResult> {
  console.info("[ACADEMY-CV] getCvAvatarDraftCompareContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvAvatarDraftCompareContextPayload,
    GetCvAvatarDraftCompareContextResult
  >(functions, "getCvAvatarDraftCompareContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvAvatarDraftCompareContext done", {
    linkId: res.data.linkId,
    match: res.data.compare?.summary.match ?? 0,
  });
  return res.data;
}

export async function callGetCvAvatarPromotionPreviewContext(
  payload: GetCvAvatarPromotionPreviewContextPayload
): Promise<GetCvAvatarPromotionPreviewContextResult> {
  console.info("[ACADEMY-CV] getCvAvatarPromotionPreviewContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvAvatarPromotionPreviewContextPayload,
    GetCvAvatarPromotionPreviewContextResult
  >(functions, "getCvAvatarPromotionPreviewContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvAvatarPromotionPreviewContext done", {
    linkId: res.data.linkId,
    previewCount: res.data.previews?.length ?? 0,
    proposedLevel: res.data.previews?.[0]?.proposedLevel,
    proposedTier: res.data.previews?.[0]?.proposedTier,
  });
  return res.data;
}

export async function callGetCvAvatarPromotionPreviewCompareContext(
  payload: GetCvAvatarPromotionPreviewCompareContextPayload
): Promise<GetCvAvatarPromotionPreviewCompareContextResult> {
  console.info("[ACADEMY-CV] getCvAvatarPromotionPreviewCompareContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvAvatarPromotionPreviewCompareContextPayload,
    GetCvAvatarPromotionPreviewCompareContextResult
  >(functions, "getCvAvatarPromotionPreviewCompareContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvAvatarPromotionPreviewCompareContext done", {
    linkId: res.data.linkId,
    changed: res.data.compare?.summary.changed ?? 0,
  });
  return res.data;
}

export function parseAvatarPromotionPreviewReviewError(error: unknown): {
  code: string;
  message: string;
} {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Avatar promotion preview 검토 요청 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callReviewAvatarPromotionPreview(
  payload: ReviewAvatarPromotionPreviewPayload
): Promise<ReviewAvatarPromotionPreviewResult> {
  console.info("[ACADEMY-CV] reviewAvatarPromotionPreview", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
    previewId: payload.previewId,
    decision: payload.decision,
  });
  const fn = httpsCallable<
    ReviewAvatarPromotionPreviewPayload,
    ReviewAvatarPromotionPreviewResult
  >(functions, "reviewAvatarPromotionPreview", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] reviewAvatarPromotionPreview done", {
    validationStatus: res.data.validationStatus,
  });
  return res.data;
}

export function parseAvatarPromotionWriteError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Avatar Promotion Apply 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callPromoteCvGrowthToPlayerAvatar(
  payload: PromoteCvGrowthToPlayerAvatarPayload
): Promise<PromoteCvGrowthToPlayerAvatarResult> {
  console.info("[ACADEMY-CV] promoteCvGrowthToPlayerAvatar", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
    previewId: payload.previewId,
  });
  const fn = httpsCallable<
    PromoteCvGrowthToPlayerAvatarPayload,
    PromoteCvGrowthToPlayerAvatarResult
  >(functions, "promoteCvGrowthToPlayerAvatar", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] promoteCvGrowthToPlayerAvatar done", {
    auditId: res.data.auditId,
    afterOvr: res.data.afterOvr,
  });
  return res.data;
}

export function parseAvatarDraftReviewError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Avatar draft 검토 요청 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callReviewAvatarDraft(
  payload: ReviewAvatarDraftPayload
): Promise<ReviewAvatarDraftResult> {
  console.info("[ACADEMY-CV] reviewAvatarDraft", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
    draftId: payload.draftId,
    decision: payload.decision,
  });
  const fn = httpsCallable<ReviewAvatarDraftPayload, ReviewAvatarDraftResult>(
    functions,
    "reviewAvatarDraft",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] reviewAvatarDraft done", {
    validationStatus: res.data.validationStatus,
  });
  return res.data;
}

export async function callGetCvPromotionPreviewCompareContext(
  payload: GetCvPromotionPreviewCompareContextPayload
): Promise<GetCvPromotionPreviewCompareContextResult> {
  console.info("[ACADEMY-CV] getCvPromotionPreviewCompareContext", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
  });
  const fn = httpsCallable<
    GetCvPromotionPreviewCompareContextPayload,
    GetCvPromotionPreviewCompareContextResult
  >(functions, "getCvPromotionPreviewCompareContext", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] getCvPromotionPreviewCompareContext done", {
    linkId: res.data.linkId,
    changed: res.data.compare?.summary.changed ?? 0,
  });
  return res.data;
}

export function parsePromotionPreviewReviewError(error: unknown): {
  code: string;
  message: string;
} {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Promotion preview 검토 요청 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callReviewPromotionPreview(
  payload: ReviewPromotionPreviewPayload
): Promise<ReviewPromotionPreviewResult> {
  console.info("[ACADEMY-CV] reviewPromotionPreview", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
    previewId: payload.previewId,
    decision: payload.decision,
  });
  const fn = httpsCallable<ReviewPromotionPreviewPayload, ReviewPromotionPreviewResult>(
    functions,
    "reviewPromotionPreview",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] reviewPromotionPreview done", {
    validationStatus: res.data.validationStatus,
    validatedBy: res.data.validatedBy,
  });
  return res.data;
}

export function parsePromotionWriteError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Promotion SoT write 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callPromoteCvGrowthToPlayerOvr(
  payload: PromoteCvGrowthToPlayerOvrPayload
): Promise<PromoteCvGrowthToPlayerOvrResult> {
  console.info("[ACADEMY-CV] promoteCvGrowthToPlayerOvr", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
    previewId: payload.previewId,
  });
  const fn = httpsCallable<PromoteCvGrowthToPlayerOvrPayload, PromoteCvGrowthToPlayerOvrResult>(
    functions,
    "promoteCvGrowthToPlayerOvr",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] promoteCvGrowthToPlayerOvr done", {
    auditId: res.data.auditId,
    afterOvr: res.data.afterOvr,
  });
  return res.data;
}

export function parseOvrDraftReviewError(error: unknown): {
  code: string;
  message: string;
} {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "OVR draft 검토 요청 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callReviewOvrDraft(
  payload: ReviewOvrDraftPayload
): Promise<ReviewOvrDraftResult> {
  console.info("[ACADEMY-CV] reviewOvrDraft", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
    draftId: payload.draftId,
    decision: payload.decision,
  });
  const fn = httpsCallable<ReviewOvrDraftPayload, ReviewOvrDraftResult>(
    functions,
    "reviewOvrDraft",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] reviewOvrDraft done", {
    validationStatus: res.data.validationStatus,
    validatedBy: res.data.validatedBy,
  });
  return res.data;
}

export function parseInterpretationCandidateReviewError(error: unknown): {
  code: string;
  message: string;
} {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Interpretation candidate 검토 요청 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callReviewInterpretationCandidate(
  payload: ReviewInterpretationCandidatePayload
): Promise<ReviewInterpretationCandidateResult> {
  console.info("[ACADEMY-CV] reviewInterpretationCandidate", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
    candidateId: payload.candidateId,
    decision: payload.decision,
  });
  const fn = httpsCallable<
    ReviewInterpretationCandidatePayload,
    ReviewInterpretationCandidateResult
  >(functions, "reviewInterpretationCandidate", { timeout: 60_000 });
  const res = await fn(payload);
  console.info("[ACADEMY-CV] reviewInterpretationCandidate done", {
    reviewStatus: res.data.reviewStatus,
    reviewedBy: res.data.reviewedBy,
  });
  return res.data;
}

export function parseCvGrowthLinkReviewError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "CV growth link 검토 요청 실패"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callReviewCvGrowthLink(
  payload: ReviewCvGrowthLinkPayload
): Promise<ReviewCvGrowthLinkResult> {
  console.info("[ACADEMY-CV] reviewCvGrowthLink", {
    teamId: payload.teamId,
    mediaId: payload.mediaId,
    linkId: payload.linkId,
    decision: payload.decision,
  });
  const fn = httpsCallable<ReviewCvGrowthLinkPayload, ReviewCvGrowthLinkResult>(
    functions,
    "reviewCvGrowthLink",
    { timeout: 60_000 }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-CV] reviewCvGrowthLink done", {
    reviewStatus: res.data.reviewStatus,
    reviewedBy: res.data.reviewedBy,
  });
  return res.data;
}
