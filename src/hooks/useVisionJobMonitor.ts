/**
 * RC5-3 — Vision Job Monitor (visionMatchIndex + visionUploadQueue + aiIngest/visionRuns)
 */

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMatchVisionPipelineStatus } from "@/hooks/useMatchVisionPipelineStatus";
import { useVisionUploadQueueStatus } from "@/hooks/useVisionUploadQueueStatus";
import {
  mapQueueStatusToUi,
  stepProgress,
  type VisionJobMonitorRunDoc,
  type VisionJobMonitorState,
} from "@/lib/vision/visionJobMonitorTypes";
import type { VisionPipelineStep, VisionRunStatus } from "@/lib/vision/visionRunTypes";
import type { VisionUploadQueueStatus } from "@/lib/vision/visionUploadQueueTypes";

const IDLE: Omit<VisionJobMonitorState, "teamId" | "matchId"> = {
  loading: true,
  active: false,
  uiStatus: "none",
  pipelineStep: null,
  progress: 0,
  mediaId: null,
  runId: null,
  analysisId: null,
  queueStatus: null,
  retryCount: 0,
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  updatedAt: null,
  completedAt: null,
  hasRunDoc: false,
  hasQueueDoc: false,
  hasIndexDoc: false,
};

function parseRunDoc(runId: string, data: Record<string, unknown>): VisionJobMonitorRunDoc {
  return {
    runId,
    status: (typeof data.status === "string" ? data.status : "queued") as VisionRunStatus,
    pipelineStep:
      typeof data.pipelineStep === "string"
        ? (data.pipelineStep as VisionPipelineStep)
        : null,
    progress: typeof data.progress === "number" ? data.progress : null,
    retryCount: typeof data.retryCount === "number" ? data.retryCount : 0,
    errorCode: typeof data.errorCode === "string" ? data.errorCode : null,
    errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : null,
    startedAt: data.startedAt ?? data.processingStartedAt ?? data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    completedAt: data.completedAt ?? null,
    createdAt: data.createdAt ?? null,
  };
}

export function useVisionJobMonitor(
  teamId: string | undefined,
  matchId: string | undefined,
  enabled = true
): VisionJobMonitorState {
  const pipeline = useMatchVisionPipelineStatus(teamId, matchId, enabled);
  const mediaId = pipeline.index?.mediaId ?? undefined;
  const runId =
    pipeline.index?.latestRunId ?? pipeline.index?.runId ?? undefined;

  const queue = useVisionUploadQueueStatus(teamId, mediaId, enabled && Boolean(mediaId));
  const [runDoc, setRunDoc] = useState<VisionJobMonitorRunDoc | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  useEffect(() => {
    const tid = teamId?.trim();
    const mid = mediaId?.trim();
    const rid = runId?.trim();
    if (!enabled || !tid || !mid || !rid) {
      setRunDoc(null);
      setRunLoading(false);
      return;
    }

    setRunLoading(true);
    const ref = doc(db, "teams", tid, "aiIngest", mid, "visionRuns", rid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRunDoc(null);
          setRunLoading(false);
          return;
        }
        setRunDoc(parseRunDoc(rid, snap.data() as Record<string, unknown>));
        setRunLoading(false);
      },
      () => {
        setRunDoc(null);
        setRunLoading(false);
      }
    );
    return () => unsub();
  }, [teamId, mediaId, runId, enabled]);

  return useMemo(() => {
    const tid = teamId?.trim() ?? "";
    const mid = matchId?.trim() ?? "";
    const index = pipeline.index;
    const queueDoc = queue.doc;
    const loading = pipeline.loading || queue.loading || runLoading;

    if (!enabled || !tid || !mid) {
      return { ...IDLE, loading: false, teamId: tid, matchId: mid };
    }

    const queueStatus = (queueDoc?.status ?? null) as VisionUploadQueueStatus | null;
    const queueUi = mapQueueStatusToUi(queueStatus);

    let uiStatus = pipeline.uiStatus;
    if (runDoc?.status === "retrying") uiStatus = "retrying";
    else if (runDoc?.status === "processing") uiStatus = "analyzing";
    else if (runDoc?.status === "failed") uiStatus = "failed";
    else if (runDoc?.status === "completed") uiStatus = "completed";
    else if (runDoc?.status === "queued") uiStatus = "queued";
    else if (queueUi && uiStatus === "none") uiStatus = queueUi;

    const pipelineStep =
      runDoc?.pipelineStep ??
      index?.pipelineStep ??
      (queueStatus === "uploaded" ? "upload" : queueStatus === "queued" ? "queued" : null);

    const progress =
      runDoc?.progress ??
      index?.progress ??
      (pipelineStep ? stepProgress(pipelineStep) : 0);

    const errorCode = runDoc?.errorCode ?? index?.errorCode ?? queueDoc?.errorCode ?? null;
    const errorMessage =
      runDoc?.errorMessage ?? index?.errorMessage ?? queueDoc?.errorMessage ?? null;

    const active =
      uiStatus !== "none" ||
      Boolean(index?.hasVision) ||
      Boolean(queueDoc) ||
      Boolean(runDoc);

    return {
      loading,
      active,
      uiStatus,
      pipelineStep,
      progress: typeof progress === "number" ? progress : stepProgress(pipelineStep),
      teamId: tid,
      matchId: mid,
      mediaId: index?.mediaId ?? queueDoc?.mediaId ?? mediaId ?? null,
      runId: runId ?? null,
      analysisId: index?.latestAnalysisId ?? index?.analysisId ?? queueDoc?.analysisId ?? null,
      queueStatus,
      retryCount: runDoc?.retryCount ?? 0,
      errorCode,
      errorMessage,
      startedAt: runDoc?.startedAt ?? null,
      updatedAt: runDoc?.updatedAt ?? null,
      completedAt: runDoc?.completedAt ?? index?.analysisCompletedAt ?? null,
      hasRunDoc: Boolean(runDoc),
      hasQueueDoc: Boolean(queueDoc),
      hasIndexDoc: Boolean(index),
    };
  }, [
    teamId,
    matchId,
    enabled,
    pipeline,
    queue,
    runDoc,
    runLoading,
    mediaId,
    runId,
  ]);
}
