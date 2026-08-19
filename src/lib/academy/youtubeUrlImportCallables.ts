import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { TranscriptSegment } from "@/components/ai-growth/types";

const YOUTUBE_URL_IMPORT_TIMEOUT_MS = 540_000;

export type StartYoutubeUrlAcademyImportPayload = {
  teamId: string;
  playerName: string;
  youtubeUrl: string;
};

export type StartYoutubeUrlAcademyImportResult = {
  ok: true;
  success: true;
  teamId: string;
  mediaId: string;
  storagePath: string;
  provider: string;
  status: "completed";
  segmentCount: number;
  durationSeconds: number | null;
  transcriptLanguage: string | null;
  transcriptSegments: TranscriptSegment[];
  pipelineElapsedMs: number;
  source: "youtube_url";
  importStatus: "imported";
  playerName: string;
  youtubeUrl: string;
};

export function parseYoutubeUrlImportError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return {
      code: String(e.code ?? "unknown"),
      message: String(e.message ?? "Callable failed"),
    };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callStartYoutubeUrlAcademyImport(
  payload: StartYoutubeUrlAcademyImportPayload
): Promise<StartYoutubeUrlAcademyImportResult> {
  console.info("[10E] startYoutubeUrlAcademyImport", {
    teamId: payload.teamId,
    youtubeUrl: payload.youtubeUrl.slice(0, 80),
  });
  const fn = httpsCallable<
    StartYoutubeUrlAcademyImportPayload,
    StartYoutubeUrlAcademyImportResult
  >(functions, "startYoutubeUrlAcademyImport", {
    timeout: YOUTUBE_URL_IMPORT_TIMEOUT_MS,
  });
  const res = await fn(payload);
  console.info("[10E] import+ingest completed", {
    provider: res.data.provider,
    segmentCount: res.data.segmentCount,
  });
  return res.data;
}
