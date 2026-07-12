/**
 * Vision v6-7 — visionRuns + visionAnalysis persist (server only)
 */
import { createHash, randomUUID } from "node:crypto";
import { FieldValue, getFirestore, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { mediaDocRef } from "./academyMediaIngestHelpers";
import {
  VISION_ANALYSIS_FIRESTORE_SCHEMA_VERSION,
  VISION_ANALYSIS_OPS_VERSION,
  VISION_ENGINE_VERSION,
  VISION_MODEL_WEIGHTS,
  VISION_PIPELINE_VERSION,
  VISION_PIPELINE_STEP_PROGRESS,
  VISION_PRODUCTION_GEV_PRESET,
  VISION_RUN_SCHEMA_VERSION,
  VISION_WORKER_VERSION,
  type VisionPipelineStep,
  type VisionRunStartedFrom,
  type VisionRunStatus,
  type VisionTrackingWorkerPayload,
  type VisionGevWorkerPayload,
  type VisionInputQualityPayload,
} from "./academyVisionTypes";
import { normalizeVisionResultForFirestore } from "./academyVisionNormalize";
import { assignVisionMatchIndexErrorFields } from "./academyVisionMatchIndexErrors";

export { assignVisionMatchIndexErrorFields } from "./academyVisionMatchIndexErrors";

export const VISION_MATCH_INDEX_COLLECTION = "visionMatchIndex" as const;
export const VISION_RUNS_COLLECTION = "visionRuns" as const;
export const VISION_ANALYSIS_COLLECTION = "visionAnalysis" as const;

function visionRunRef(teamId: string, mediaId: string, runId: string) {
  return mediaDocRef(teamId, mediaId).collection(VISION_RUNS_COLLECTION).doc(runId);
}

function visionMatchIndexRef(teamId: string, matchId: string) {
  return getFirestore()
    .collection("teams")
    .doc(teamId)
    .collection(VISION_MATCH_INDEX_COLLECTION)
    .doc(matchId);
}

function visionAnalysisColRef(teamId: string, matchId: string) {
  return getFirestore()
    .collection("teams")
    .doc(teamId)
    .collection("matches")
    .doc(matchId)
    .collection(VISION_ANALYSIS_COLLECTION);
}

export function resolveVideoHashFromMedia(data: Record<string, unknown>): string {
  const explicit =
    typeof data.videoHash === "string" && data.videoHash.trim() ? data.videoHash.trim() : "";
  if (explicit) return explicit;

  const storagePath = String(data.storagePath ?? "").trim();
  const size = String(data.uploadedSizeBytes ?? data.sizeBytes ?? "").trim();
  if (storagePath) {
    return createHash("sha256")
      .update(`${storagePath}:${size}`)
      .digest("hex")
      .slice(0, 32);
  }

  const mediaId = typeof data.mediaId === "string" ? data.mediaId.trim() : "";
  return mediaId || "unknown";
}

export function buildVisionIdempotencyKey(
  teamId: string,
  matchId: string | null,
  videoHash: string
): string {
  return `${teamId}:${matchId ?? "test"}:${videoHash}`;
}

export function pipelineStepProgress(step: VisionPipelineStep | null | undefined): number {
  if (!step) return 0;
  return VISION_PIPELINE_STEP_PROGRESS[step] ?? 0;
}

const ACTIVE_VISION_STATUSES: VisionRunStatus[] = ["queued", "retrying", "processing"];

export type VisionMatchIndexState = {
  runId: string | null;
  mediaId: string | null;
  analysisId: string | null;
  status: VisionRunStatus | "uploading" | "none";
  idempotencyKey: string | null;
  videoHash: string | null;
};

export async function readVisionMatchIndexState(
  teamId: string,
  matchId: string
): Promise<VisionMatchIndexState | null> {
  const snap = await visionMatchIndexRef(teamId, matchId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    runId: typeof data.runId === "string" ? data.runId : null,
    mediaId: typeof data.mediaId === "string" ? data.mediaId : null,
    analysisId: typeof data.analysisId === "string" ? data.analysisId : null,
    status: (typeof data.status === "string" ? data.status : "none") as VisionMatchIndexState["status"],
    idempotencyKey: typeof data.idempotencyKey === "string" ? data.idempotencyKey : null,
    videoHash: typeof data.videoHash === "string" ? data.videoHash : null,
  };
}

export async function findActiveVisionRun(
  teamId: string,
  mediaId: string,
  idempotencyKey: string,
  matchId?: string | null
): Promise<{ runId: string; status: VisionRunStatus; mediaId: string } | null> {
  if (matchId) {
    const index = await readVisionMatchIndexState(teamId, matchId);
    if (
      index &&
      index.idempotencyKey === idempotencyKey &&
      ACTIVE_VISION_STATUSES.includes(index.status as VisionRunStatus) &&
      index.runId
    ) {
      return {
        runId: index.runId,
        status: index.status as VisionRunStatus,
        mediaId: index.mediaId ?? mediaId,
      };
    }
  }

  const snap = await mediaDocRef(teamId, mediaId)
    .collection(VISION_RUNS_COLLECTION)
    .where("idempotencyKey", "==", idempotencyKey)
    .where("status", "in", ACTIVE_VISION_STATUSES)
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;
  const status = String(doc.data()?.status ?? "") as VisionRunStatus;
  return { runId: doc.id, status, mediaId };
}

export async function findCompletedVisionRun(
  teamId: string,
  matchId: string,
  idempotencyKey: string
): Promise<{ runId: string; analysisId: string | null; mediaId: string | null } | null> {
  const index = await readVisionMatchIndexState(teamId, matchId);
  if (!index || index.status !== "completed" || index.idempotencyKey !== idempotencyKey) {
    return null;
  }
  if (!index.runId) return null;
  return {
    runId: index.runId,
    analysisId: index.analysisId,
    mediaId: index.mediaId,
  };
}

export async function resolveVisionRetryCount(
  teamId: string,
  mediaId: string,
  startedFrom: VisionRunStartedFrom
): Promise<number> {
  if (startedFrom !== "retry") return 0;
  const snap = await mediaDocRef(teamId, mediaId)
    .collection(VISION_RUNS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  const prev = snap.docs[0]?.data()?.retryCount;
  return (typeof prev === "number" ? prev : 0) + 1;
}

export async function upsertVisionMatchIndex(params: {
  teamId: string;
  matchId: string;
  mediaId: string;
  runId?: string | null;
  status: VisionRunStatus | "uploading";
  analysisId?: string | null;
  pipelineStep?: VisionPipelineStep | null;
  progress?: number | null;
  idempotencyKey?: string | null;
  videoHash?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const progress =
    params.progress != null
      ? params.progress
      : pipelineStepProgress(params.pipelineStep ?? null);

  const patch: DocumentData = {
    schemaVersion: VISION_RUN_SCHEMA_VERSION,
    teamId: params.teamId,
    matchId: params.matchId,
    mediaId: params.mediaId,
    runId: params.runId ?? null,
    latestRunId: params.runId ?? null,
    status: params.status,
    analysisId: params.analysisId ?? null,
    latestAnalysisId: params.analysisId ?? null,
    hasVision: true,
    productionPreset: VISION_PRODUCTION_GEV_PRESET,
    progress,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (params.pipelineStep) patch.pipelineStep = params.pipelineStep;
  if (params.idempotencyKey) patch.idempotencyKey = params.idempotencyKey;
  if (params.videoHash) patch.videoHash = params.videoHash;
  // PAI-031 — failed sets errors; any non-failed write clears stale merge leftovers
  assignVisionMatchIndexErrorFields(
    patch,
    {
      status: params.status,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    },
    FieldValue.delete()
  );
  if (params.status === "completed") {
    patch.analysisCompletedAt = FieldValue.serverTimestamp();
  }

  await visionMatchIndexRef(params.teamId, params.matchId).set(patch, { merge: true });
}

export type CreateVisionRunParams = {
  teamId: string;
  mediaId: string;
  matchId: string | null;
  isTestUpload: boolean;
  startedBy: string;
  startedFrom: VisionRunStartedFrom;
  idempotencyKey: string;
  videoHash: string;
  retryCount?: number;
};

export async function createVisionRunDoc(params: CreateVisionRunParams): Promise<{
  runId: string;
  idempotencyKey: string;
}> {
  const runId = randomUUID().replace(/-/g, "").slice(0, 24);
  const retryCount = params.retryCount ?? 0;

  await visionRunRef(params.teamId, params.mediaId, runId).set({
    schemaVersion: VISION_RUN_SCHEMA_VERSION,
    runId,
    teamId: params.teamId,
    mediaId: params.mediaId,
    matchId: params.matchId,
    isTestUpload: params.isTestUpload,
    status: "queued" satisfies VisionRunStatus,
    pipelineStep: "queued" satisfies VisionPipelineStep,
    progress: pipelineStepProgress("queued"),
    idempotencyKey: params.idempotencyKey,
    videoHash: params.videoHash,
    retryCount,
    productionPreset: VISION_PRODUCTION_GEV_PRESET,
    pipelineVersion: VISION_PIPELINE_VERSION,
    visionEngineVersion: VISION_ENGINE_VERSION,
    workerVersion: VISION_WORKER_VERSION,
    modelWeights: VISION_MODEL_WEIGHTS,
    startedBy: params.startedBy,
    startedFrom: params.startedFrom,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (params.matchId) {
    await upsertVisionMatchIndex({
      teamId: params.teamId,
      matchId: params.matchId,
      mediaId: params.mediaId,
      runId,
      status: "queued",
      pipelineStep: "queued",
      idempotencyKey: params.idempotencyKey,
      videoHash: params.videoHash,
    });
  }

  return { runId, idempotencyKey: params.idempotencyKey };
}

export async function updateVisionRunStatus(params: {
  teamId: string;
  mediaId: string;
  runId: string;
  matchId: string | null;
  status: VisionRunStatus;
  errorCode?: string;
  errorMessage?: string;
  analysisId?: string;
  pipelineElapsedMs?: number;
  pipelineStep?: VisionPipelineStep;
  progress?: number;
  idempotencyKey?: string;
  videoHash?: string;
  tracking?: VisionTrackingWorkerPayload;
  gev?: VisionGevWorkerPayload;
  inputQuality?: VisionInputQualityPayload;
}): Promise<void> {
  const step = params.pipelineStep;
  const progress =
    params.progress != null ? params.progress : step ? pipelineStepProgress(step) : undefined;

  const patch: DocumentData = {
    status: params.status,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (step) patch.pipelineStep = step;
  if (progress != null) patch.progress = progress;
  if (params.status === "retrying" || params.status === "processing") {
    patch.startedAt = FieldValue.serverTimestamp();
  }
  if (params.status === "processing") {
    patch.processingStartedAt = FieldValue.serverTimestamp();
  }
  if (params.status === "completed") {
    patch.completedAt = FieldValue.serverTimestamp();
    if (params.analysisId) patch.analysisId = params.analysisId;
    if (params.pipelineElapsedMs != null) patch.pipelineElapsedMs = params.pipelineElapsedMs;
  }
  if (params.status === "failed") {
    patch.failedAt = FieldValue.serverTimestamp();
    if (params.errorCode) patch.errorCode = params.errorCode;
    if (params.errorMessage) patch.errorMessage = params.errorMessage;
  }
  if (params.status === "cancelled") {
    patch.cancelledAt = FieldValue.serverTimestamp();
  }

  if (params.tracking) {
    const t = params.tracking;
    patch.trackingStatus = t.trackingStatus;
    if (t.tracksPath) patch.tracksPath = t.tracksPath;
    if (t.previewPath) patch.previewPath = t.previewPath;
    if (t.registryPath) patch.registryPath = t.registryPath;
    if (t.summaryPath) patch.trackingSummaryPath = t.summaryPath;
    if (t.bucket) patch.trackingBucket = t.bucket;
    if (t.summary) patch.trackingSummary = t.summary;
  }

  if (params.gev) {
    const g = params.gev;
    patch.gevStatus = g.gevStatus;
    if (g.gevEventCount != null) patch.gevEventCount = g.gevEventCount;
    if (g.eventsPath) patch.gevEventsPath = g.eventsPath;
    if (g.summaryPath) patch.gevSummaryPath = g.summaryPath;
    if (g.bucket) patch.gevBucket = g.bucket;
    if (g.summary) patch.gevSummary = g.summary;
    if (g.reason) patch.gevReason = g.reason;
  }

  if (params.inputQuality) {
    const iq = params.inputQuality;
    const readiness = iq.visionReadiness;
    if (readiness) {
      if (readiness.score != null) patch.visionReadinessScore = readiness.score;
      if (readiness.grade) patch.visionReadinessGrade = readiness.grade;
      if (readiness.gevAllowed != null) patch.visionReadinessGevAllowed = readiness.gevAllowed;
      if (readiness.userMessage) patch.visionReadinessMessage = readiness.userMessage;
    }
    if (iq.reportPaths) patch.visionInputQualityPaths = iq.reportPaths;
    if (iq.bucket) patch.visionInputQualityBucket = iq.bucket;
  }

  await visionRunRef(params.teamId, params.mediaId, params.runId).set(patch, { merge: true });

  if (params.matchId) {
    await upsertVisionMatchIndex({
      teamId: params.teamId,
      matchId: params.matchId,
      mediaId: params.mediaId,
      runId: params.runId,
      status: params.status,
      analysisId: params.analysisId ?? null,
      pipelineStep:
        params.pipelineStep ??
        (params.status === "completed"
          ? "done"
          : params.status === "retrying"
            ? "queued"
            : params.status === "processing"
              ? "tracking"
              : undefined),
      progress,
      idempotencyKey: params.idempotencyKey ?? null,
      videoHash: params.videoHash ?? null,
      errorCode: params.status === "failed" ? params.errorCode ?? null : null,
      errorMessage: params.status === "failed" ? params.errorMessage ?? null : null,
    });
  }
}

export async function appendVisionAnalysisAdmin(params: {
  teamId: string;
  matchId: string;
  visionResult: Record<string, unknown>;
  createdByUid: string;
  sourcePath?: string;
  runId?: string;
  mediaId?: string;
  fiiSummary?: Record<string, unknown> | null;
  tracking?: VisionTrackingWorkerPayload;
  gev?: VisionGevWorkerPayload;
}): Promise<string> {
  const normalized = normalizeVisionResultForFirestore(params.visionResult, params.sourcePath);
  const fii = params.fiiSummary;
  const doc: DocumentData = {
    schemaVersion: VISION_ANALYSIS_FIRESTORE_SCHEMA_VERSION,
    visionResultSchemaVersion: normalized.schemaVersion,
    analysisVersion: VISION_ANALYSIS_OPS_VERSION,
    preset: VISION_PRODUCTION_GEV_PRESET,
    pipelineVersion: VISION_PIPELINE_VERSION,
    teamId: params.teamId,
    matchId: params.matchId,
    productionPreset: VISION_PRODUCTION_GEV_PRESET,
    playerFii: normalized.playerFii,
    playmaker: normalized.playmaker,
    ballProgression: normalized.ballProgression,
    pressureZone: normalized.pressureZone,
    teamCompactness: normalized.teamCompactness,
    tacticalReport: normalized.tacticalReport,
    sourcePath: normalized.sourcePath,
    createdByUid: params.createdByUid,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (params.runId) doc.runId = params.runId;
  if (params.mediaId) doc.mediaId = params.mediaId;
  if (fii) {
    doc.fiiSummary = fii;
    const teamFii = fii.teamFii as Record<string, unknown> | undefined;
    if (teamFii) doc.teamFii = teamFii;
    const coach = fii.coachInsights as Record<string, unknown> | undefined;
    const parent = fii.parentInsights as Record<string, unknown> | undefined;
    if (coach) doc.coachInsights = coach;
    if (parent) doc.parentInsights = parent;
    const timeline = fii.timeline as unknown;
    if (timeline) doc.timeline = timeline;
    const summary = fii.matchSummary as Record<string, unknown> | undefined;
    if (summary) doc.summary = summary;
  }

  if (params.tracking) {
    const t = params.tracking;
    doc.trackingStatus = t.trackingStatus;
    if (t.tracksPath) doc.tracksPath = t.tracksPath;
    if (t.previewPath) doc.previewPath = t.previewPath;
    if (t.registryPath) doc.registryPath = t.registryPath;
    if (t.summaryPath) doc.trackingSummaryPath = t.summaryPath;
    if (t.bucket) doc.trackingBucket = t.bucket;
    if (t.summary) doc.trackingSummary = t.summary;
  }

  if (params.gev) {
    const g = params.gev;
    doc.gevStatus = g.gevStatus;
    if (g.gevEventCount != null) doc.gevEventCount = g.gevEventCount;
    if (g.eventsPath) doc.gevEventsPath = g.eventsPath;
    if (g.summaryPath) doc.gevSummaryPath = g.summaryPath;
    if (g.bucket) doc.gevBucket = g.bucket;
    if (g.summary) doc.gevSummary = g.summary;
    if (g.reason) doc.gevReason = g.reason;
  }

  const ref = await visionAnalysisColRef(params.teamId, params.matchId).add(doc);

  logger.info("[vision] analysis appended", {
    teamId: params.teamId,
    matchId: params.matchId,
    analysisId: ref.id,
  });

  return ref.id;
}

export async function cancelVisionRunIfQueued(params: {
  teamId: string;
  mediaId: string;
  runId: string;
  cancelledBy: string;
}): Promise<void> {
  const runRef = visionRunRef(params.teamId, params.mediaId, params.runId);
  const snap = await runRef.get();
  if (!snap.exists) throw new Error("visionRun not found");
  const data = snap.data()!;
  const status = String(data.status ?? "") as VisionRunStatus;
  if (status === "cancelled") throw new Error("ALREADY_CANCELLED");
  if (status !== "queued") throw new Error("CANNOT_CANCEL");

  const matchId = typeof data.matchId === "string" ? data.matchId : null;

  await runRef.set(
    {
      status: "cancelled" satisfies VisionRunStatus,
      cancelledBy: params.cancelledBy,
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (matchId) {
    await upsertVisionMatchIndex({
      teamId: params.teamId,
      matchId,
      mediaId: params.mediaId,
      runId: params.runId,
      status: "cancelled",
    });
  }
}
