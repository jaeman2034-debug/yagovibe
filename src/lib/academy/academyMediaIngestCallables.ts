import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { TranscriptSegment } from "@/components/ai-growth/types";

/** Worker transcribe can run up to ~9 minutes */
const ACADEMY_INGEST_CALLABLE_TIMEOUT_MS = 540_000;

export type AcademyMediaIngestStatus =
  | "pending_upload"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export type CreateAcademyMediaUploadPayload = {
  teamId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  matchId?: string;
  isTestUpload?: boolean;
};

export type CreateAcademyMediaUploadResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  uploadUrl: string;
  storagePath: string;
  expiresAt: number;
};

export type ConfirmAcademyMediaUploadPayload = {
  teamId: string;
  mediaId: string;
};

export type ConfirmAcademyMediaUploadResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  storagePath: string;
  status: "uploaded";
  sizeBytes: number;
  visionQueueEnqueued?: true;
  matchId?: string;
};

export type StartAcademyMediaIngestionPayload = {
  teamId: string;
  mediaId: string;
};

export type StartAcademyMediaIngestionResult = {
  ok: true;
  success: true;
  teamId: string;
  mediaId: string;
  storagePath: string;
  provider: string;
  status: "completed";
  segmentCount: number;
  durationSeconds: number;
  transcriptLanguage: string | null;
  transcriptSegments: TranscriptSegment[];
  pipelineElapsedMs: number;
};

export type GetAcademyMediaIngestionStatusPayload = {
  teamId: string;
  mediaId: string;
};

export type GetAcademyMediaIngestionStatusResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  status: AcademyMediaIngestStatus | string;
  provider: string | null;
  segmentCount: number;
  durationSeconds: number | null;
  transcriptLanguage: string | null;
  storagePath: string | null;
  rawStoragePath?: string | null;
  anonymizedStoragePath?: string | null;
  privacyStatus?: string | null;
  anonymizedAt?: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  transcriptSegments: TranscriptSegment[];
};

export function parseAcademyMediaIngestError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Callable failed"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callCreateAcademyMediaUpload(
  payload: CreateAcademyMediaUploadPayload
): Promise<CreateAcademyMediaUploadResult> {
  const fn = httpsCallable<CreateAcademyMediaUploadPayload, CreateAcademyMediaUploadResult>(
    functions,
    "createAcademyMediaUpload"
  );
  const res = await fn(payload);
  return res.data;
}

export async function callConfirmAcademyMediaUpload(
  payload: ConfirmAcademyMediaUploadPayload
): Promise<ConfirmAcademyMediaUploadResult> {
  const fn = httpsCallable<ConfirmAcademyMediaUploadPayload, ConfirmAcademyMediaUploadResult>(
    functions,
    "confirmAcademyMediaUpload"
  );
  const res = await fn(payload);
  return res.data;
}

export async function callStartAcademyMediaIngestion(
  payload: StartAcademyMediaIngestionPayload
): Promise<StartAcademyMediaIngestionResult> {
  console.info("[ACADEMY-MP4] startAcademyMediaIngestion", payload);
  const fn = httpsCallable<StartAcademyMediaIngestionPayload, StartAcademyMediaIngestionResult>(
    functions,
    "startAcademyMediaIngestion",
    { timeout: ACADEMY_INGEST_CALLABLE_TIMEOUT_MS }
  );
  const res = await fn(payload);
  console.info("[ACADEMY-MP4] start completed", {
    provider: res.data.provider,
    segmentCount: res.data.segmentCount,
    durationSeconds: res.data.durationSeconds,
  });
  return res.data;
}

export async function callGetAcademyMediaIngestionStatus(
  payload: GetAcademyMediaIngestionStatusPayload
): Promise<GetAcademyMediaIngestionStatusResult> {
  const fn = httpsCallable<
    GetAcademyMediaIngestionStatusPayload,
    GetAcademyMediaIngestionStatusResult
  >(functions, "getAcademyMediaIngestionStatus");
  const res = await fn(payload);
  return res.data;
}
