/**
 * Sprint 10B-1d — Validation Console MP4 upload → Whisper transcript
 */
import { Crop, Loader2, Upload, FileVideo } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ACADEMY_MP4_MAX_BYTES,
  academyMp4IngestionBlockedReason,
  academyMp4RuntimeLabel,
  canRunAcademyMp4Ingestion,
} from "@/lib/academy/academyMediaIngestRuntime";
import {
  callConfirmAcademyMediaUpload,
  callCreateAcademyMediaUpload,
  callGetAcademyMediaIngestionStatus,
  callStartAcademyMediaIngestion,
  parseAcademyMediaIngestError,
  type AcademyMediaIngestStatus,
} from "@/lib/academy/academyMediaIngestCallables";
import type { TranscriptSegment } from "@/components/ai-growth/types";
import {
  AcademyUploadConsentBlock,
  isAcademyUploadConsentComplete,
  type AcademyUploadConsentState,
} from "@/components/legal/AcademyUploadConsentBlock";
import { CvRoiPickerPanel } from "@/components/ai-growth/cv/CvRoiPickerPanel";
import { CvReviewPanel } from "@/components/ai-growth/cv/CvReviewPanel";
import { CvRunInternalPanel } from "@/components/ai-growth/cv/CvRunInternalPanel";
import { resolveCvPilotMediaId } from "@/lib/academy/academyCvDevSmoke";
import { useCompletedTeamGames } from "@/hooks/useCompletedTeamGames";
import { callProcessVisionUploadQueue } from "@/lib/academy/academyVisionCallables";
import { useVisionUploadQueueStatus } from "@/hooks/useVisionUploadQueueStatus";
import { mapQueueToPipelineHint } from "@/lib/vision/visionUploadQueueTypes";
import { formatTeamGameLabel } from "@/services/matchPlayFeedbackService";

const POLL_MS = 2000;

export type AcademyMp4IngestCompletePayload = {
  mediaId: string;
  storagePath: string;
  provider: string;
  segmentCount: number;
  durationSeconds: number;
  transcriptLanguage: string | null;
  transcriptSegments: TranscriptSegment[];
  pipelineElapsedMs: number;
};

type Phase = "idle" | "uploading" | "uploaded" | "processing" | "completed" | "failed";

type Props = {
  teamId: string;
  playerId?: string;
  /** Pre-selected match for Vision pipeline (required unless isTestUpload) */
  matchId?: string;
  /** Parent-owned media id (e.g. Validation Console ingestionJobId after step change) */
  initialMediaId?: string | null;
  disabled?: boolean;
  onIngestComplete: (payload: AcademyMp4IngestCompletePayload) => void;
};

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mapIngestErrorMessage(raw: string, selectedFile: File | null): string {
  const lower = raw.toLowerCase();
  if (lower.includes("deadline-exceeded") || lower.includes("deadline_exceeded")) {
    return [
      "AI 전사(Whisper) 요청이 시간 초과되었습니다.",
      "업로드는 완료되었습니다. Play 탭 → Vision Coach에서 「Vision 분석 실행」을 진행할 수 있습니다.",
      "Whisper 전사는 짧은 영상(1~3분)으로 다시 시도하거나, 잠시 후 상태를 새로고침해 주세요.",
      selectedFile ? `선택 파일: ${selectedFile.name} (${formatBytes(selectedFile.size)})` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (
    lower.includes("413") ||
    lower.includes("content size limit") ||
    lower.includes("maximum content size")
  ) {
    return [
      "영상 본문 크기가 Whisper 처리 한도를 초과해 분석이 중단되었습니다 (413).",
      selectedFile ? `선택 파일: ${selectedFile.name} (${formatBytes(selectedFile.size)})` : null,
      `권장: ${formatBytes(ACADEMY_MP4_MAX_BYTES)} 이하 파일로 재시도하거나,`,
      "YouTube URL import/수동 자막 경로를 사용해 주세요.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return raw;
}

function phaseLabel(phase: Phase, serverStatus: AcademyMediaIngestStatus | null): string {
  if (phase === "failed") return "실패 (재시도 가능)";
  if (phase === "completed") return "완료";
  if (serverStatus === "processing" || phase === "processing") return "AI 분석 중…";
  const map: Record<Phase, string> = {
    idle: "대기",
    uploading: "업로드 중",
    uploaded: "업로드 완료",
    processing: "분석 중",
    completed: "완료",
    failed: "실패",
  };
  return map[phase];
}

export function AcademyMp4UploadPanel({
  teamId,
  playerId,
  matchId: matchIdProp,
  initialMediaId,
  disabled,
  onIngestComplete,
}: Props) {
  const { games: completedGames } = useCompletedTeamGames(teamId);
  const [selectedMatchId, setSelectedMatchId] = useState(matchIdProp?.trim() ?? "");
  const [isTestUpload, setIsTestUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [serverStatus, setServerStatus] = useState<AcademyMediaIngestStatus | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [segmentCount, setSegmentCount] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [transcriptLanguage, setTranscriptLanguage] = useState<string | null>(null);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [pipelineElapsedMs, setPipelineElapsedMs] = useState<number | null>(null);
  const [consent, setConsent] = useState<AcademyUploadConsentState>({
    hasUploadRight: false,
    agreedAiAnalysis: false,
    agreedGuardianConsent: false,
  });
  const [privacyStatus, setPrivacyStatus] = useState<string | null>(null);
  const [cvReviewRefreshKey, setCvReviewRefreshKey] = useState(0);
  const [visionQueueRunning, setVisionQueueRunning] = useState(false);
  const visionQueue = useVisionUploadQueueStatus(teamId, mediaId ?? undefined, Boolean(mediaId));
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const busy = phase === "uploading" || phase === "processing";
  const cvPilotMediaId = resolveCvPilotMediaId();
  const cvInternalMediaId = mediaId ?? cvPilotMediaId ?? null;
  const boundMediaIdForCv = mediaId ?? initialMediaId?.trim() ?? null;
  const showCvUploadBlock = !!(file && mediaId && phase !== "idle" && phase !== "uploading");
  const showCvInternalPanel = !!(cvInternalMediaId && (showCvUploadBlock || cvPilotMediaId));
  const showCvRoiWaitingCard =
    phase === "completed" && Boolean(boundMediaIdForCv) && !file && !busy;

  async function startVisionAutoQueue(mediaIdForQueue: string) {
    setVisionQueueRunning(true);
    try {
      const result = await callProcessVisionUploadQueue({ teamId, mediaId: mediaIdForQueue });
      if (result.queueStatus === "completed" || result.idempotent) {
        console.info("[ACADEMY-MP4] Vision auto queue completed", result);
      } else if (result.queueStatus === "failed") {
        setError(
          result.errorMessage ??
            "Vision 자동 분석에 실패했습니다. Play 탭에서 재시도할 수 있습니다."
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Vision 자동 분석 시작에 실패했습니다.";
      console.error("[ACADEMY-MP4] Vision auto queue failed", e);
      setError(message);
    } finally {
      setVisionQueueRunning(false);
    }
  }

  const blocked = academyMp4IngestionBlockedReason();
  const consentOk = isAcademyUploadConsentComplete(consent);
  const fileTooLarge = file != null && file.size > ACADEMY_MP4_MAX_BYTES;
  const uploadBlockedReason =
    blocked ??
    (!teamId ? "팀 ID가 없습니다. 팀 페이지에서 다시 열어 주세요." : null) ??
    (fileTooLarge
      ? `파일이 너무 큽니다 (${formatBytes(file.size)} / 최대 ${formatBytes(ACADEMY_MP4_MAX_BYTES)}).`
      : null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  useEffect(() => {
    if (!import.meta.env.DEV || !showCvRoiWaitingCard || !boundMediaIdForCv) return;
    console.info("[ACADEMY-CV] ROI waiting for local File object", {
      mediaId: boundMediaIdForCv,
      privacyStatus: privacyStatus ?? null,
      reason: "local File required",
    });
  }, [boundMediaIdForCv, privacyStatus, showCvRoiWaitingCard]);

  const applyStatus = useCallback((data: Awaited<ReturnType<typeof callGetAcademyMediaIngestionStatus>>) => {
    const st = String(data.status) as AcademyMediaIngestStatus;
    setServerStatus(st);
    if (data.provider) setProvider(data.provider);
    if (typeof data.segmentCount === "number") setSegmentCount(data.segmentCount);
    if (typeof data.durationSeconds === "number") setDurationSeconds(data.durationSeconds);
    if (data.transcriptLanguage) setTranscriptLanguage(data.transcriptLanguage);
    if (data.storagePath) setStoragePath(data.storagePath);
    if (st === "completed" && data.transcriptSegments?.length) {
      setTranscriptSegments(data.transcriptSegments);
    }
    if ("privacyStatus" in data) {
      setPrivacyStatus(typeof data.privacyStatus === "string" ? data.privacyStatus : null);
    }
    if (st === "failed") {
      setPhase("failed");
      setError(data.errorMessage ?? data.errorCode ?? "전사 실패");
    }
  }, []);

  const hydrateIngestionStatus = useCallback(
    async (id: string) => {
      const data = await callGetAcademyMediaIngestionStatus({ teamId, mediaId: id });
      applyStatus(data);
      const st = String(data.status);
      if (st === "completed") {
        setPhase("completed");
      } else if (st === "uploaded") {
        setPhase("uploaded");
      } else if (st === "processing") {
        setPhase("processing");
      }
      return data;
    },
    [applyStatus, teamId]
  );

  useEffect(() => {
    const boundId = initialMediaId?.trim();
    if (!boundId || !teamId) return;
    setMediaId((prev) => prev ?? boundId);
    mediaIdRef.current = mediaIdRef.current ?? boundId;
  }, [initialMediaId, teamId]);

  useEffect(() => {
    const id = (mediaId ?? initialMediaId?.trim()) || null;
    if (!id || !teamId) return;

    let cancelled = false;
    void (async () => {
      try {
        const data = await hydrateIngestionStatus(id);
        if (cancelled) return;
        console.info("[ACADEMY-MP4] ingestion status hydrated", {
          mediaId: id,
          status: data.status,
          privacyStatus: data.privacyStatus ?? null,
        });
      } catch (e) {
        if (cancelled) return;
        console.warn("[ACADEMY-MP4] ingestion status hydrate failed", { teamId, mediaId: id, error: e });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId, mediaId, initialMediaId, hydrateIngestionStatus]);

  const startPoll = useCallback(
    (id: string) => {
      stopPoll();
      pollRef.current = setInterval(() => {
        void (async () => {
          try {
            const data = await callGetAcademyMediaIngestionStatus({ teamId, mediaId: id });
            applyStatus(data);
          } catch (e) {
            console.warn("[ACADEMY-MP4] poll failed", e);
          }
        })();
      }, POLL_MS);
    },
    [applyStatus, stopPoll, teamId]
  );

  async function handleUpload() {
    if (!file) {
      setError("업로드할 영상을 먼저 선택해 주세요.");
      return;
    }
    if (!teamId) {
      setError("팀 ID가 없습니다. 팀 페이지에서 AI 성장 검증을 다시 열어 주세요.");
      return;
    }
    const block = academyMp4IngestionBlockedReason();
    if (block) {
      setError(block);
      return;
    }
    if (file.size > ACADEMY_MP4_MAX_BYTES) {
      setError(
        `파일이 너무 큽니다 (현재 ${formatBytes(file.size)} / 최대 ${formatBytes(ACADEMY_MP4_MAX_BYTES)}). ` +
          "더 작은 파일을 선택하거나 YouTube URL import를 사용해 주세요."
      );
      return;
    }

    const matchId = (matchIdProp?.trim() || selectedMatchId.trim()) || undefined;
    if (!isTestUpload && !matchId) {
      setError("경기 분석 영상은 경기(match)를 선택해야 합니다. 테스트 영상은 '테스트 업로드'를 켜 주세요.");
      return;
    }

    const contentType =
      file.type === "video/quicktime" ? "video/quicktime" : "video/mp4";

    setError(null);
    setPhase("uploading");
    setServerStatus(null);
    setProvider(null);
    setSegmentCount(null);
    setDurationSeconds(null);
    setTranscriptLanguage(null);
    setTranscriptSegments([]);
    setPipelineElapsedMs(null);
    setPrivacyStatus(null);

    try {
      const created = await callCreateAcademyMediaUpload({
        teamId,
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
        matchId,
        isTestUpload,
      });

      const putRes = await fetch(created.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Storage 업로드 실패 (${putRes.status})`);
      }

      const confirmed = await callConfirmAcademyMediaUpload({
        teamId,
        mediaId: created.mediaId,
      });

      setMediaId(confirmed.mediaId);
      mediaIdRef.current = confirmed.mediaId;
      setStoragePath(confirmed.storagePath);
      setPhase("uploaded");
      setServerStatus("uploaded");
      console.info("[ACADEMY-MP4] upload OK", confirmed);

      if (confirmed.visionQueueEnqueued && confirmed.mediaId) {
        void startVisionAutoQueue(confirmed.mediaId);
      }
    } catch (e) {
      setPhase("failed");
      const parsed = parseAcademyMediaIngestError(e);
      setError(mapIngestErrorMessage(parsed.message, file));
      console.error("[ACADEMY-MP4] upload failed", {
        code: parsed.code,
        message: parsed.message,
        teamId,
        raw: e,
      });
    }
  }

  async function handleStartIngestion() {
    const id = mediaIdRef.current;
    if (!id || !teamId) return;

    setError(null);
    setPhase("processing");
    setServerStatus("processing");
    const startedAt = Date.now();
    startPoll(id);

    try {
      const result = await callStartAcademyMediaIngestion({ teamId, mediaId: id });
      stopPoll();
      try {
        const refreshed = await callGetAcademyMediaIngestionStatus({ teamId, mediaId: id });
        applyStatus(refreshed);
      } catch (refreshErr) {
        console.warn("[ACADEMY-MP4] post-ingest status refresh failed", {
          teamId,
          mediaId: id,
          error: refreshErr,
        });
      }
      setPhase("completed");
      setServerStatus("completed");
      setProvider(result.provider);
      setSegmentCount(result.segmentCount);
      setDurationSeconds(result.durationSeconds);
      setTranscriptLanguage(result.transcriptLanguage);
      setTranscriptSegments(result.transcriptSegments ?? []);
      setPipelineElapsedMs(result.pipelineElapsedMs ?? Date.now() - startedAt);

      onIngestComplete({
        mediaId: id,
        storagePath: result.storagePath,
        provider: result.provider,
        segmentCount: result.segmentCount,
        durationSeconds: result.durationSeconds,
        transcriptLanguage: result.transcriptLanguage,
        transcriptSegments: result.transcriptSegments ?? [],
        pipelineElapsedMs: result.pipelineElapsedMs ?? Date.now() - startedAt,
      });
    } catch (e) {
      stopPoll();
      try {
        const last = await callGetAcademyMediaIngestionStatus({ teamId, mediaId: id });
        applyStatus(last);
        if (last.status === "completed" && last.transcriptSegments?.length) {
          onIngestComplete({
            mediaId: id,
            storagePath: last.storagePath ?? storagePath ?? "",
            provider: last.provider ?? "whisper",
            segmentCount: last.segmentCount,
            durationSeconds: last.durationSeconds ?? 0,
            transcriptLanguage: last.transcriptLanguage,
            transcriptSegments: last.transcriptSegments,
            pipelineElapsedMs: Date.now() - startedAt,
          });
          setPhase("completed");
          return;
        }
      } catch {
        /* ignore */
      }
      setPhase("failed");
      setServerStatus((prev) => (prev === "processing" ? "uploaded" : prev));
      const parsed = parseAcademyMediaIngestError(e);
      const isTimeout =
        parsed.code.includes("deadline-exceeded") ||
        parsed.message.toLowerCase().includes("deadline-exceeded");
      setError(
        isTimeout
          ? mapIngestErrorMessage("deadline-exceeded", file)
          : mapIngestErrorMessage(parsed.message, file)
      );
      console.error("[ACADEMY-MP4] ingest failed", {
        code: parsed.code,
        message: parsed.message,
        teamId,
        raw: e,
      });
    }
  }

  function handleFileChange(next: File | null) {
    const boundMediaId = mediaIdRef.current ?? initialMediaId?.trim() ?? null;

    setFile(next);
    stopPoll();

    if (!next) {
      setPhase("idle");
      setServerStatus(null);
      if (!initialMediaId?.trim()) {
        setMediaId(null);
        mediaIdRef.current = null;
        setStoragePath(null);
        setProvider(null);
        setSegmentCount(null);
        setTranscriptSegments([]);
        setPrivacyStatus(null);
      }
      setError(null);
      return;
    }

    if (next.size > ACADEMY_MP4_MAX_BYTES) {
      setError(
        `파일이 너무 큽니다 (${formatBytes(next.size)} / 최대 ${formatBytes(ACADEMY_MP4_MAX_BYTES)}). ` +
          "업로드 버튼은 비활성화됩니다."
      );
      return;
    }

    if (boundMediaId) {
      setMediaId(boundMediaId);
      mediaIdRef.current = boundMediaId;
      setPhase((prev) => (prev === "idle" || prev === "uploading" ? "completed" : prev));
      setError(null);
      return;
    }

    setPhase("idle");
    setServerStatus(null);
    setMediaId(null);
    mediaIdRef.current = null;
    setStoragePath(null);
    setProvider(null);
    setSegmentCount(null);
    setTranscriptSegments([]);
    setPrivacyStatus(null);
    setError(null);
  }

  if (!canRunAcademyMp4Ingestion()) {
    return (
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        {blocked}
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border-2 border-emerald-300 bg-emerald-50/40 p-4">
      {cvPilotMediaId && !mediaId ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
          CV pilot — cvRuns media{" "}
          <code className="font-mono text-[10px]">{cvPilotMediaId}</code>
          {" · "}
          CV Run · Internal 패널 (Step 1/2 · Step 5)
        </p>
      ) : null}

      {showCvInternalPanel && cvInternalMediaId ? (
        <CvRunInternalPanel
          teamId={teamId}
          mediaId={cvInternalMediaId}
          refreshKey={cvReviewRefreshKey}
        />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <FileVideo className="h-5 w-5 text-emerald-700" />
            영상 업로드
          </h4>
          <p className="mt-1 text-xs text-gray-700">
            아카데미 훈련 영상을 업로드하면 AI 분석과 훈련 리포트 생성에 활용됩니다.
          </p>
          <p className="mt-1 text-[11px] text-emerald-800">{academyMp4RuntimeLabel()}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            phase === "completed" && "border-emerald-400 bg-emerald-100 text-emerald-900",
            phase === "failed" && "border-red-300 bg-red-50 text-red-800",
            busy && "border-blue-300 bg-blue-50 text-blue-900",
            !busy && phase !== "completed" && phase !== "failed" && "border-gray-300 bg-white text-gray-700"
          )}
        >
          {phaseLabel(phase, serverStatus)}
        </span>
      </div>

      {(visionQueue.doc || visionQueueRunning) && !isTestUpload ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            visionQueue.doc?.status === "failed"
              ? "border-rose-300 bg-rose-50 text-rose-900"
              : visionQueue.doc?.status === "completed"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-violet-300 bg-violet-50 text-violet-900"
          )}
          data-testid="vision-upload-queue-banner"
        >
          <p className="font-bold">Vision 자동 분석 큐</p>
          <p className="mt-0.5">
            {visionQueueRunning
              ? "분석을 시작하는 중…"
              : mapQueueToPipelineHint(visionQueue.doc?.status) ?? "대기 중"}
          </p>
          {visionQueue.doc?.errorMessage ? (
            <p className="mt-1 text-[11px] opacity-90">{visionQueue.doc.errorMessage}</p>
          ) : null}
        </div>
      ) : null}

      {!matchIdProp?.trim() ? (
        <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-violet-950">
            <input
              type="checkbox"
              checked={isTestUpload}
              disabled={disabled || busy}
              onChange={(e) => setIsTestUpload(e.target.checked)}
              data-testid="academy-upload-test-toggle"
            />
            테스트 영상 (matchId 없이 업로드)
          </label>
          {!isTestUpload ? (
            <label className="block">
              <span className="text-xs font-semibold text-violet-900">경기 선택 (필수)</span>
              <select
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
                value={selectedMatchId}
                disabled={disabled || busy}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                data-testid="academy-upload-match-select"
              >
                <option value="">— 경기를 선택하세요 —</option>
                {completedGames.map((g) => (
                  <option key={g.id} value={g.id}>
                    {formatTeamGameLabel(teamId, g)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-violet-800">
          Vision 경기 연결: <span className="font-mono">{matchIdProp}</span>
        </p>
      )}

      <label className="block">
        <span className="text-sm font-semibold text-gray-800">영상 선택</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/*"
          disabled={disabled || busy}
          className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <p className="mt-1 text-xs text-gray-600">
            {file.name} · {formatBytes(file.size)}
          </p>
        ) : null}
      </label>

      {uploadBlockedReason && file ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
          {uploadBlockedReason}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={
            !file ||
            disabled ||
            busy ||
            Boolean(uploadBlockedReason) ||
            phase === "uploaded" ||
            phase === "completed"
          }
          onClick={() => void handleUpload()}
        >
          {phase === "uploading" ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              업로드 중…
            </>
          ) : (
            <>
              <Upload className="mr-1 h-4 w-4" />
              업로드
            </>
          )}
        </Button>
      </div>

      <AcademyUploadConsentBlock
        value={consent}
        onChange={setConsent}
        disabled={disabled || busy}
      />

      <Button
        type="button"
        size="sm"
        className="w-full sm:w-auto"
        disabled={phase !== "uploaded" || disabled || busy || !consentOk}
        onClick={() => void handleStartIngestion()}
      >
        {phase === "processing" ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            AI 분석 중…
          </>
        ) : (
          "분석 시작"
        )}
      </Button>

      {import.meta.env.DEV && (mediaId || provider || segmentCount != null) ? (
        <div className="rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 text-xs text-gray-800">
          {mediaId ? <p>Media ID: {mediaId}</p> : null}
          {storagePath ? <p className="mt-0.5 break-all">Storage: {storagePath}</p> : null}
          {serverStatus ? (
            <p className="mt-0.5">
              Status: <strong>{serverStatus}</strong>
            </p>
          ) : null}
          {provider ? (
            <p className="mt-0.5">
              Provider: <strong>{provider}</strong>
            </p>
          ) : null}
          {durationSeconds != null ? <p className="mt-0.5">Duration: {durationSeconds}s</p> : null}
          {segmentCount != null ? (
            <p className="mt-0.5">
              Segments: <strong>{segmentCount}</strong>
            </p>
          ) : null}
          {transcriptLanguage ? (
            <p className="mt-0.5">Language: {transcriptLanguage}</p>
          ) : null}
          {pipelineElapsedMs != null ? (
            <p className="mt-0.5">Pipeline: {(pipelineElapsedMs / 1000).toFixed(1)}s</p>
          ) : null}
          {privacyStatus ? (
            <p className="mt-0.5">
              Privacy: <strong>{privacyStatus}</strong>
            </p>
          ) : null}
        </div>
      ) : null}

      {phase === "completed" && transcriptSegments.length > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-emerald-900">
            분석 자막 ({transcriptSegments.length}구간)
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-gray-700">
            {transcriptSegments.slice(0, 12).map((seg) => (
              <li key={seg.id}>
                [{seg.start}s–{seg.end}s] {seg.text}
              </li>
            ))}
          </ul>
          {transcriptSegments.length > 12 ? (
            <p className="mt-1 text-[10px] text-gray-500">
              … 외 {transcriptSegments.length - 12}줄 (다음 단계 본문에 반영됨)
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>
      ) : null}

      {showCvRoiWaitingCard ? (
        <div
          className="space-y-3 rounded-xl border-2 border-violet-300 bg-violet-50/50 p-4"
          data-testid="cv-roi-waiting-card"
        >
          <div className="flex items-start gap-2">
            <Crop className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
            <div className="space-y-2 text-sm text-violet-950">
              <p className="font-bold">CV 분석을 계속하려면 동일한 MP4 파일을 다시 선택하세요.</p>
              <p className="text-xs leading-relaxed text-violet-900">
                Whisper 분석은 완료되었습니다.
                {privacyStatus === "anonymized" ? (
                  <> 영상은 이미 익명화(anonymized)되었습니다.</>
                ) : privacyStatus ? (
                  <> (privacy: {privacyStatus})</>
                ) : null}
              </p>
              <p className="text-xs leading-relaxed text-violet-900">
                ROI 프레임 추출을 위해 동일한 MP4를 다시 선택하면 CV 분석 · ROI 패널이 표시되고 「CV
                분석 시작」을 실행할 수 있습니다.
              </p>
              {boundMediaIdForCv ? (
                <p className="font-mono text-[10px] text-violet-800">
                  mediaId: {boundMediaIdForCv}
                </p>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-violet-300 bg-white text-violet-900 hover:bg-violet-100"
            disabled={disabled || busy}
            onClick={() => fileInputRef.current?.click()}
          >
            파일 다시 선택
          </Button>
        </div>
      ) : null}

      {showCvUploadBlock ? (
        <>
          <CvRoiPickerPanel
            teamId={teamId}
            mediaId={mediaId!}
            videoFile={file!}
            playerId={playerId}
            privacyStatus={privacyStatus}
            disabled={disabled || busy}
            onCvRunUpdated={() => setCvReviewRefreshKey((k) => k + 1)}
          />
          <CvReviewPanel
            teamId={teamId}
            mediaId={mediaId!}
            refreshKey={cvReviewRefreshKey}
            disabled={disabled || busy}
            onReviewed={() => setCvReviewRefreshKey((k) => k + 1)}
          />
        </>
      ) : null}
    </div>
  );
}
