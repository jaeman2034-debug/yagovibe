import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { TranscriptSegment } from "@/components/ai-growth/types";

/** extract+transcribe can exceed default ~70s client timeout on longer clips */
const INGESTION_CALLABLE_TIMEOUT_MS = 540_000;

export type IngestionStatus = "processing" | "completed" | "failed";
export type IngestionStage = "extracting_audio" | "transcribing" | "normalizing" | "completed";

export type StartYoutubeIngestionPayload = {
  teamId: string;
  youtubeUrl: string;
};

export type StartYoutubeIngestionResult = {
  ok?: true;
  success?: true;
  teamId: string;
  jobId: string;
  status: IngestionStatus | "processing";
  transcriptId?: string;
  segmentCount?: number;
  provider?: string;
  youtubeUrl?: string;
  audioPath?: string;
  duration?: number;
  transcribeElapsedMs?: number;
  pipelineElapsedMs?: number;
  transcriptLanguage?: string | null;
  transcriptSegments?: TranscriptSegment[];
};

export type IngestionCallableErrorInfo = {
  code: string;
  message: string;
  details?: unknown;
};

export type GetYoutubeIngestionStatusPayload = {
  teamId: string;
  jobId: string;
};

export type GetYoutubeIngestionStatusResult = {
  ok: true;
  teamId: string;
  jobId: string;
  status: IngestionStatus;
  stage: IngestionStage;
  transcriptId: string | null;
  segmentCount: number;
  retryable: boolean;
  lastError: { code: string; message: string } | null;
  updatedAt: number | null;
};

export type GetTranscriptByIdPayload = {
  teamId: string;
  transcriptId: string;
};

export type GetTranscriptByIdResult = {
  ok: true;
  teamId: string;
  transcriptId: string;
  jobId: string | null;
  segmentCount: number;
  segments: TranscriptSegment[];
  source: Record<string, unknown> | null;
};

export function parseIngestionCallableError(error: unknown): IngestionCallableErrorInfo {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string; details?: unknown };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Callable failed"),
      details: e.details,
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callStartYoutubeIngestion(
  payload: StartYoutubeIngestionPayload
): Promise<StartYoutubeIngestionResult> {
  console.info("[AI-INGEST] startYoutubeIngestion request", payload);
  const fn = httpsCallable<StartYoutubeIngestionPayload, StartYoutubeIngestionResult>(
    functions,
    "startYoutubeIngestion",
    { timeout: INGESTION_CALLABLE_TIMEOUT_MS }
  );
  try {
    const res = await fn(payload);
    console.info("[AI-INGEST] startYoutubeIngestion response", {
      provider: res.data.provider,
      segmentCount: res.data.segmentCount ?? res.data.transcriptSegments?.length ?? 0,
      transcriptLanguage: res.data.transcriptLanguage,
      status: res.data.status,
      pipelineElapsedMs: res.data.pipelineElapsedMs,
      hasSegments: Boolean(res.data.transcriptSegments?.length),
    });
    return res.data;
  } catch (error) {
    const parsed = parseIngestionCallableError(error);
    console.error("[AI-INGEST] startYoutubeIngestion failed", parsed);
    throw error;
  }
}

export async function callGetYoutubeIngestionStatus(
  payload: GetYoutubeIngestionStatusPayload
): Promise<GetYoutubeIngestionStatusResult> {
  console.info("[AI-INGEST] getYoutubeIngestionStatus request", payload);
  const fn = httpsCallable<GetYoutubeIngestionStatusPayload, GetYoutubeIngestionStatusResult>(
    functions,
    "getYoutubeIngestionStatus"
  );
  const res = await fn(payload);
  console.info("[AI-INGEST] getYoutubeIngestionStatus response", res.data);
  return res.data;
}

export async function callGetTranscriptById(
  payload: GetTranscriptByIdPayload
): Promise<GetTranscriptByIdResult> {
  console.info("[AI-INGEST] getTranscriptById request", payload);
  const fn = httpsCallable<GetTranscriptByIdPayload, GetTranscriptByIdResult>(
    functions,
    "getTranscriptById"
  );
  const res = await fn(payload);
  console.info("[AI-INGEST] getTranscriptById response", {
    teamId: res.data.teamId,
    transcriptId: res.data.transcriptId,
    segmentCount: res.data.segmentCount,
    source: res.data.source,
  });
  return res.data;
}

