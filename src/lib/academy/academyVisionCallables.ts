import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const VISION_CALLABLE_TIMEOUT_MS = 900_000;

export type StartVisionAnalysisPayload = {
  teamId: string;
  mediaId: string;
  matchId?: string;
  isTestUpload?: boolean;
  startedFrom?: "auto" | "manual" | "retry";
};

export type StartVisionAnalysisResult = {
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

export type ProcessVisionUploadQueueResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  matchId: string | null;
  queueStatus: "uploaded" | "queued" | "processing" | "completed" | "failed";
  runId?: string;
  analysisId?: string;
  errorCode?: string;
  errorMessage?: string;
  idempotent?: boolean;
};

export type CancelVisionAnalysisPayload = {
  teamId: string;
  mediaId: string;
  runId: string;
};

export async function callStartVisionAnalysis(
  payload: StartVisionAnalysisPayload
): Promise<StartVisionAnalysisResult> {
  const fn = httpsCallable(functions, "startVisionAnalysis", {
    timeout: VISION_CALLABLE_TIMEOUT_MS,
  });
  const res = await fn(payload);
  return res.data as StartVisionAnalysisResult;
}

export async function callRetryVisionAnalysis(
  payload: Omit<StartVisionAnalysisPayload, "startedFrom">
): Promise<StartVisionAnalysisResult> {
  const fn = httpsCallable(functions, "retryVisionAnalysis", {
    timeout: VISION_CALLABLE_TIMEOUT_MS,
  });
  const res = await fn(payload);
  return res.data as StartVisionAnalysisResult;
}

export async function callProcessVisionUploadQueue(payload: {
  teamId: string;
  mediaId: string;
}): Promise<ProcessVisionUploadQueueResult> {
  const fn = httpsCallable(functions, "processVisionUploadQueue", {
    timeout: VISION_CALLABLE_TIMEOUT_MS,
  });
  const res = await fn(payload);
  return res.data as ProcessVisionUploadQueueResult;
}

export async function callCancelVisionAnalysis(
  payload: CancelVisionAnalysisPayload
): Promise<{ ok: true; status: "cancelled" }> {
  const fn = httpsCallable(functions, "cancelVisionAnalysis");
  const res = await fn(payload);
  return res.data as { ok: true; status: "cancelled" };
}
