/**
 * Sprint 10E — Step 1 YouTube URL → import → Whisper (Beta)
 */
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractYoutubeVideoId } from "@/lib/youtube/extractYoutubeVideoId";
import {
  callStartYoutubeUrlAcademyImport,
  parseYoutubeUrlImportError,
} from "@/lib/academy/youtubeUrlImportCallables";
import {
  YOUTUBE_URL_IMPORT_BETA_HINT,
  YOUTUBE_URL_IMPORT_BETA_TITLE,
  YOUTUBE_URL_IMPORT_FAIL_PARENT_MSG,
} from "@/lib/academy/youtubeUrlImportRuntime";
import type { AcademyMp4IngestCompletePayload } from "@/components/ai-growth/AcademyMp4UploadPanel";

type Phase = "idle" | "importing" | "transcribing" | "completed" | "failed";

type Props = {
  teamId: string;
  playerName: string;
  youtubeUrl: string;
  onChangeUrl: (v: string) => void;
  disabled?: boolean;
  onIngestComplete: (payload: AcademyMp4IngestCompletePayload) => void;
  /** YouTube 실패 시 Step 1 MP4 업로드 경로로 전환 */
  onFallbackToMp4?: () => void;
  onFail?: () => void;
};

function phaseMessage(phase: Phase): string {
  if (phase === "importing") return "영상 가져오는 중…";
  if (phase === "transcribing") return "Whisper 분석 중…";
  if (phase === "completed") return "Transcript 생성 완료";
  return "";
}

export function YoutubeUrlImportPanel({
  teamId,
  playerName,
  youtubeUrl,
  onChangeUrl,
  disabled,
  onIngestComplete,
  onFallbackToMp4,
  onFail,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const videoId = extractYoutubeVideoId(youtubeUrl);
  const busy = phase === "importing" || phase === "transcribing";

  async function handleAnalyze() {
    if (!videoId) {
      setError("유효한 YouTube URL을 입력해 주세요.");
      return;
    }
    setError(null);
    setPhase("importing");
    try {
      setPhase("transcribing");
      const result = await callStartYoutubeUrlAcademyImport({
        teamId,
        playerName: playerName.trim() || "선수",
        youtubeUrl: youtubeUrl.trim(),
      });
      const segments = result.transcriptSegments ?? [];
      if (!segments.length) {
        throw new Error("transcript segment가 비어 있습니다.");
      }
      setPhase("completed");
      onIngestComplete({
        mediaId: result.mediaId,
        storagePath: result.storagePath,
        provider: result.provider,
        segmentCount: result.segmentCount,
        durationSeconds: result.durationSeconds ?? 0,
        transcriptLanguage: result.transcriptLanguage,
        transcriptSegments: segments,
        pipelineElapsedMs: result.pipelineElapsedMs,
      });
    } catch (err) {
      setPhase("failed");
      const parsed = parseYoutubeUrlImportError(err);
      setError(parsed.message);
      console.error("[10E] URL import failed", parsed);
      onFail?.();
      onFallbackToMp4?.();
    }
  }

  function handleFallbackToMp4() {
    onFallbackToMp4?.();
    requestAnimationFrame(() => {
      document
        .getElementById("academy-mp4-upload-anchor")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  return (
    <div className="rounded-2xl border border-violet-300 bg-violet-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-base font-bold text-violet-950">{YOUTUBE_URL_IMPORT_BETA_TITLE}</h4>
      </div>
      <p className="mt-2 text-xs text-violet-900">{YOUTUBE_URL_IMPORT_BETA_HINT}</p>

      <label className="mt-3 block">
        <span className="text-sm font-semibold text-gray-800">YouTube URL</span>
        <input
          type="url"
          value={youtubeUrl}
          onChange={(e) => onChangeUrl(e.target.value)}
          disabled={busy || disabled}
          className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-base"
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </label>

      {phaseMessage(phase) ? (
        <p
          className={cn(
            "mt-3 flex items-center gap-2 text-sm font-semibold",
            phase === "failed" ? "text-red-700" : "text-violet-800"
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {phaseMessage(phase)}
        </p>
      ) : null}

      <Button
        type="button"
        className="mt-4 h-12 w-full text-base font-bold"
        disabled={busy || disabled || !youtubeUrl.trim()}
        onClick={() => void handleAnalyze()}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            분석 중…
          </>
        ) : (
          "분석 시작"
        )}
      </Button>

      {phase === "failed" ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
          <p className="font-semibold whitespace-pre-line">{YOUTUBE_URL_IMPORT_FAIL_PARENT_MSG}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleFallbackToMp4}
          >
            MP4 업로드로 계속하기
          </Button>
          {error ? (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-medium">기술 상세</summary>
              <p className="mt-1 whitespace-pre-wrap">{error}</p>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
