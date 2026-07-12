/**
 * Vision v6-7 — execute vision analysis pipeline (shared by start/retry callables)
 */
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import {
  assertCanUploadAcademyMedia,
  mediaDocRef,
} from "./academyMediaIngestHelpers";
import {
  appendVisionAnalysisAdmin,
  createVisionRunDoc,
  findActiveVisionRun,
  findCompletedVisionRun,
  updateVisionRunStatus,
  buildVisionIdempotencyKey,
  resolveVideoHashFromMedia,
  resolveVisionRetryCount,
} from "./academyVisionFirestore";
import { callAcademyVisionAnalyzeOnWorker } from "./academyVisionWorkerClient";
import { recordVisionPilotOpsLog } from "./academyVisionPilotOps";
import {
  VISION_WORKER_VERSION,
  type VisionRunStartedFrom,
} from "./academyVisionTypes";
import { resolveWhisperInputStoragePath, type PrivacyMediaDocFields } from "./privacy/privacyEngineV1";

function assertMediaReadyForVision(snap: DocumentSnapshot): {
  storagePath: string;
  matchIdFromDoc: string | null;
  isTestUpload: boolean;
} {
  if (!snap.exists) {
    throw new HttpsError("not-found", "미디어 메타를 찾을 수 없습니다.");
  }
  const data = snap.data()!;
  const status = String(data.status ?? "");
  if (!["uploaded", "completed", "processing", "failed"].includes(status)) {
    throw new HttpsError(
      "failed-precondition",
      `Vision 분석을 시작할 수 없는 상태입니다: ${status || "unknown"}`
    );
  }

  let storagePath = String(data.storagePath ?? "").trim();
  try {
    storagePath = resolveWhisperInputStoragePath(data as PrivacyMediaDocFields);
  } catch {
    // legacy path
  }
  if (!storagePath) {
    throw new HttpsError("failed-precondition", "storagePath가 없습니다.");
  }

  const matchIdFromDoc =
    typeof data.matchId === "string" && data.matchId.trim() ? data.matchId.trim() : null;
  const isTestUpload = Boolean(data.isTestUpload);

  return { storagePath, matchIdFromDoc, isTestUpload };
}

function resolveMatchId(params: {
  payloadMatchId?: string;
  docMatchId: string | null;
  isTestUpload: boolean;
  payloadIsTest?: boolean;
}): string | null {
  const isTest = params.payloadIsTest ?? params.isTestUpload;
  const matchId = params.payloadMatchId?.trim() || params.docMatchId;
  if (!isTest && !matchId) {
    throw new HttpsError(
      "invalid-argument",
      "경기 분석 영상은 matchId가 필수입니다. 테스트 영상은 isTestUpload=true로 업로드하세요."
    );
  }
  return matchId ?? null;
}

async function maybeRecordPilotOpsLog(params: {
  teamId: string;
  matchId: string | null;
  isTestUpload: boolean;
  mediaId: string;
  runId: string;
  analysisId?: string | null;
  success: boolean;
  idempotent?: boolean;
  pipelineElapsedMs: number;
  startedFrom: VisionRunStartedFrom;
  errorCode?: string | null;
  errorMessage?: string | null;
  pipelineStep?: string | null;
}): Promise<void> {
  if (!params.matchId || params.isTestUpload) return;
  try {
    await recordVisionPilotOpsLog({
      teamId: params.teamId,
      matchId: params.matchId,
      mediaId: params.mediaId,
      runId: params.runId,
      analysisId: params.analysisId,
      success: params.success,
      idempotent: params.idempotent,
      pipelineElapsedMs: params.pipelineElapsedMs,
      startedFrom: params.startedFrom,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      pipelineStep: params.pipelineStep,
    });
  } catch (error) {
    logger.warn("[vision-pilot] ops log failed", {
      runId: params.runId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export type ExecuteVisionAnalysisResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  runId: string;
  matchId: string | null;
  status: "completed" | "failed" | "idempotent";
  analysisId?: string;
  errorCode?: string;
  errorMessage?: string;
  pipelineElapsedMs: number;
  idempotent?: boolean;
};

export async function executeAcademyVisionAnalysis(params: {
  teamId: string;
  mediaId: string;
  uid: string;
  matchId?: string;
  isTestUpload?: boolean;
  startedFrom: VisionRunStartedFrom;
}): Promise<ExecuteVisionAnalysisResult> {
  const startedAt = Date.now();
  const { teamId, mediaId, uid } = params;

  await assertCanUploadAcademyMedia(teamId, uid);

  const mediaRef = mediaDocRef(teamId, mediaId);
  const snap = await mediaRef.get();
  const mediaData = snap.data() ?? {};
  const { storagePath, matchIdFromDoc, isTestUpload: docTest } = assertMediaReadyForVision(snap);
  const isTestUpload = params.isTestUpload ?? docTest;
  const matchId = resolveMatchId({
    payloadMatchId: params.matchId,
    docMatchId: matchIdFromDoc,
    isTestUpload,
    payloadIsTest: params.isTestUpload,
  });

  const videoHash = resolveVideoHashFromMedia(mediaData as Record<string, unknown>);
  const idempotencyKey = buildVisionIdempotencyKey(teamId, matchId, videoHash);
  const isRetry = params.startedFrom === "retry";

  if (matchId && !isRetry) {
    const completed = await findCompletedVisionRun(teamId, matchId, idempotencyKey);
    if (completed) {
      logger.info("[vision] idempotent skip — completed run exists", {
        teamId,
        matchId,
        runId: completed.runId,
        analysisId: completed.analysisId,
      });
      await maybeRecordPilotOpsLog({
        teamId,
        matchId,
        isTestUpload,
        mediaId: completed.mediaId ?? mediaId,
        runId: completed.runId,
        analysisId: completed.analysisId,
        success: true,
        idempotent: true,
        pipelineElapsedMs: 0,
        startedFrom: params.startedFrom,
        pipelineStep: "done",
      });
      return {
        ok: true,
        teamId,
        mediaId: completed.mediaId ?? mediaId,
        runId: completed.runId,
        matchId,
        status: "idempotent",
        analysisId: completed.analysisId ?? undefined,
        pipelineElapsedMs: 0,
        idempotent: true,
      };
    }
  }

  const active = await findActiveVisionRun(teamId, mediaId, idempotencyKey, matchId);
  if (active) {
    throw new HttpsError(
      "already-exists",
      `이미 진행 중인 Vision 분석이 있습니다 (${active.status}).`
    );
  }

  const retryCount = await resolveVisionRetryCount(teamId, mediaId, params.startedFrom);

  const { runId } = await createVisionRunDoc({
    teamId,
    mediaId,
    matchId,
    isTestUpload,
    startedBy: uid,
    startedFrom: params.startedFrom,
    idempotencyKey,
    videoHash,
    retryCount,
  });

  if (isRetry) {
    await updateVisionRunStatus({
      teamId,
      mediaId,
      runId,
      matchId,
      status: "retrying",
      pipelineStep: "queued",
      idempotencyKey,
      videoHash,
    });
  }

  await updateVisionRunStatus({
    teamId,
    mediaId,
    runId,
    matchId,
    status: "processing",
    pipelineStep: "tracking",
    idempotencyKey,
    videoHash,
  });

  try {
    const worker = await callAcademyVisionAnalyzeOnWorker({
      teamId,
      mediaId,
      matchId,
      storagePath,
      sourceRunId: runId,
    });

    const pipelineElapsedMs = Date.now() - startedAt;

    if (worker.status !== "ok" || !worker.visionResult) {
      const errorCode =
        worker.error === "worker_timeout"
          ? "WORKER_TIMEOUT"
          : worker.error === "worker_unavailable"
            ? "WORKER_UNAVAILABLE"
            : "VISION_ANALYSIS_FAILED";
      const errorMessage = worker.error ?? "Vision analysis failed";

      await updateVisionRunStatus({
        teamId,
        mediaId,
        runId,
        matchId,
        status: "failed",
        errorCode,
        errorMessage,
        pipelineElapsedMs,
        idempotencyKey,
        videoHash,
        gev: worker.gev,
      });

      await mediaRef.set(
        {
          visionStatus: "failed",
          visionLastRunId: runId,
          visionLastError: errorMessage,
          visionWorkerVersion: worker.workerVersion ?? VISION_WORKER_VERSION,
        },
        { merge: true }
      );

      await maybeRecordPilotOpsLog({
        teamId,
        matchId,
        isTestUpload,
        mediaId,
        runId,
        success: false,
        pipelineElapsedMs,
        startedFrom: params.startedFrom,
        errorCode,
        errorMessage,
        pipelineStep: "failed",
      });

      return {
        ok: true,
        teamId,
        mediaId,
        runId,
        matchId,
        status: "failed",
        errorCode,
        errorMessage,
        pipelineElapsedMs,
      };
    }

    let analysisId: string | undefined;
    if (matchId) {
      await updateVisionRunStatus({
        teamId,
        mediaId,
        runId,
        matchId,
        status: "processing",
        pipelineStep: worker.gev ? "gev" : "fii",
        idempotencyKey,
        videoHash,
        tracking: worker.tracking,
        gev: worker.gev,
        inputQuality: worker.inputQuality,
      });

      await updateVisionRunStatus({
        teamId,
        mediaId,
        runId,
        matchId,
        status: "processing",
        pipelineStep: "persist",
        idempotencyKey,
        videoHash,
      });

      const resultWithMeta = {
        ...worker.visionResult,
        match_id: matchId,
        team_id: teamId,
      };
      analysisId = await appendVisionAnalysisAdmin({
        teamId,
        matchId,
        visionResult: resultWithMeta,
        createdByUid: uid,
        sourcePath: storagePath,
        runId,
        mediaId,
        fiiSummary: worker.fii?.summary ?? null,
        tracking: worker.tracking,
        gev: worker.gev,
      });
    }

    await updateVisionRunStatus({
      teamId,
      mediaId,
      runId,
      matchId,
      status: "completed",
      analysisId,
      pipelineElapsedMs,
      pipelineStep: "done",
      idempotencyKey,
      videoHash,
      tracking: worker.tracking,
      gev: worker.gev,
      inputQuality: worker.inputQuality,
    });

    await mediaRef.set(
      {
        visionStatus: "completed",
        visionLastRunId: runId,
        visionLastAnalysisId: analysisId ?? null,
        visionWorkerVersion: worker.workerVersion ?? VISION_WORKER_VERSION,
        // PAI-031 FIX B — clear stale failure copy left by a prior failed sibling run
        visionLastError: FieldValue.delete(),
        ...(matchId ? { matchId } : {}),
        isTestUpload,
      },
      { merge: true }
    );

    logger.info("[vision] pipeline completed", {
      teamId,
      mediaId,
      runId,
      matchId,
      analysisId,
      pipelineElapsedMs,
    });

    await maybeRecordPilotOpsLog({
      teamId,
      matchId,
      isTestUpload,
      mediaId,
      runId,
      analysisId,
      success: true,
      pipelineElapsedMs,
      startedFrom: params.startedFrom,
      pipelineStep: "done",
    });

    if (worker.gev) {
      const { seedGevEventCandidatesFromWorkerCompletion } = await import(
        "./visionMlops/gevEventCandidateSeeder"
      );
      try {
        const seedResult = await seedGevEventCandidatesFromWorkerCompletion({
          teamId,
          mediaId,
          matchId,
          sourceRunId: runId,
          actorUid: uid,
          gev: worker.gev,
        });
        logger.info("[vision] gevEventCandidates seed finished", {
          teamId,
          mediaId,
          runId,
          ...seedResult,
        });
      } catch (seedErr) {
        logger.warn("[vision] gevEventCandidates seed failed (non-blocking)", {
          teamId,
          mediaId,
          runId,
          error: seedErr instanceof Error ? seedErr.message : String(seedErr),
        });
      }
    } else {
      logger.warn("[vision] gev payload missing on completed pipeline", {
        teamId,
        mediaId,
        runId,
        provider: worker.provider,
      });
    }

    return {
      ok: true,
      teamId,
      mediaId,
      runId,
      matchId,
      status: "completed",
      analysisId,
      pipelineElapsedMs,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;

    const message = error instanceof Error ? error.message : String(error);
    await updateVisionRunStatus({
      teamId,
      mediaId,
      runId,
      matchId,
      status: "failed",
      errorCode: "VISION_ANALYSIS_FAILED",
      errorMessage: message,
      idempotencyKey,
      videoHash,
    });
    throw error;
  }
}
