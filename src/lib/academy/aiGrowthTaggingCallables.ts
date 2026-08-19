import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { MockGrowthEvent, TranscriptSegment } from "@/components/ai-growth/types";

const TAGGING_CALLABLE_TIMEOUT_MS = 120_000;

export type RunTranscriptGrowthTaggingPayload = {
  teamId: string;
  transcriptSegments: TranscriptSegment[];
  videoDurationSeconds?: number;
};

export type RunTranscriptGrowthTaggingResult = {
  success: true;
  teamId: string;
  provider: "gpt" | "heuristic" | "mock";
  eventCount: number;
  events: MockGrowthEvent[];
};

export function parseTaggingCallableError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return { code: String(e.code ?? "unknown"), message: String(e.message ?? "Callable failed") };
  }
  return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export async function callRunTranscriptGrowthTagging(
  payload: RunTranscriptGrowthTaggingPayload
): Promise<RunTranscriptGrowthTaggingResult> {
  console.info("[AI-TAG] runTranscriptGrowthTagging request", {
    teamId: payload.teamId,
    segmentCount: payload.transcriptSegments.length,
  });
  const fn = httpsCallable<RunTranscriptGrowthTaggingPayload, RunTranscriptGrowthTaggingResult>(
    functions,
    "runTranscriptGrowthTagging",
    { timeout: TAGGING_CALLABLE_TIMEOUT_MS }
  );
  const res = await fn(payload);
  console.info("[AI-TAG] runTranscriptGrowthTagging response", {
    provider: res.data.provider,
    eventCount: res.data.eventCount,
  });
  return res.data;
}
