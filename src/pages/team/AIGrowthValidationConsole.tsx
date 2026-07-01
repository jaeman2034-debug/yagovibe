/**
 * AI Growth Validation Console — Week 1 ingestion MVP.
 * 자동 게시 없이 코치 승인 기반으로만 동작.
 * @see docs/YAGO_AI_GROWTH_PIPELINE_V1.md
 */
import { Check, Download, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge } from "@/components/ai-growth/ConfidenceBadge";
import {
  GrowthTrendCard,
} from "@/components/ai-growth/GrowthComparisonCards";
import { ParentGrowthHeroCard } from "@/components/ai-growth/ParentGrowthHeroCard";
import { Step5GrowthTimelineCard } from "@/components/ai-growth/Step5GrowthTimelineCard";
import {
  ParentGrowthSharePanel,
  shareUrlFromSessionDelivery,
} from "@/components/ai-growth/ParentGrowthSharePanel";
import type { GrowthReportDeliveryResult } from "@/lib/ai-growth/growthReportDelivery";
import {
  callGetTranscriptById,
  callGetYoutubeIngestionStatus,
  callStartYoutubeIngestion,
  parseIngestionCallableError,
} from "@/lib/academy/aiGrowthIngestionCallables";
import {
  callRunTranscriptGrowthTagging,
  parseTaggingCallableError,
} from "@/lib/academy/aiGrowthTaggingCallables";
import {
  MOCK_GROWTH_EVENTS,
  MOCK_TRANSCRIPT_SEGMENTS,
  MOCK_VIDEO_OPTIONS,
  MOCK_YOUTUBE_URL,
  isCoachSampleDemoOption,
  type MockVideoOption,
} from "@/components/ai-growth/mockData";
import {
  generateGuardianNarrative,
  reportToneLabel,
  type ReportTone,
} from "@/components/ai-growth/guardianNarrative";
import { getEventCopy, type GuardianEventReportBlock } from "@/components/ai-growth/guardianReportCopy";
import { exportGrowthReportPdf } from "@/lib/ai-growth/exportGrowthReportPdf";
import { deliverGrowthReportForSession } from "@/lib/ai-growth/growthReportDelivery";
import { buildParentDeliveryShareMessage } from "@/lib/ai-growth/buildParentDeliveryShareMessage";
import { maybeAutoSendParentDelivery } from "@/lib/parent-delivery/sendParentDelivery";
import { exportMonthlyGrowthReportPdf } from "@/lib/ai-growth/exportMonthlyGrowthReportPdf";
import { exportSeasonGrowthReportPdf } from "@/lib/ai-growth/exportSeasonGrowthReportPdf";
import { buildWeeklyGrowthDigestForPdfExport } from "@/lib/ai-growth/weeklyGrowthDigestEngine";
import {
  buildGrowthAiSummaryFromAvatar,
} from "@/lib/ai-growth/growthAiSummaryEngine";
import { CoachGrowthAiSummaryPanel } from "@/components/ai-growth/CoachGrowthAiSummaryPanel";
import { buildMonthlyGrowthReport } from "@/lib/ai-growth/monthlyGrowthReport";
import {
  buildSeasonGrowthReport,
  inferDefaultSeason,
  listSeasonsWithSessions,
} from "@/lib/ai-growth/seasonGrowthReport";
import type { SeasonWindow } from "@/lib/ai-growth/seasonWindow";
import { lastSessionPerMonth, rankDimensionDeltas } from "@/lib/ai-growth/growthReportDimensions";
import { filterSessionsForSeason } from "@/lib/ai-growth/seasonWindow";
import type { PlayerGrowthOvrDoc } from "@/lib/ai-growth/playerGrowthOvrTypes";
import { BadgeUnlockCelebrationCard } from "@/components/ai-growth/BadgeUnlockCelebrationCard";
import { LevelUpCelebrationCard } from "@/components/ai-growth/LevelUpCelebrationCard";
import { PlayerGrowthAvatarCard } from "@/components/ai-growth/PlayerGrowthAvatarCard";
import { usePlayerGrowthAvatar } from "@/hooks/usePlayerGrowthAvatar";
import { nextBadgeHints } from "@/lib/ai-growth/avatarGrowthEngine";
import type { GrowthBadgeUnlockEvent } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import { formatBadgeUnlockNotice } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import {
  loadPlayerGrowthAvatar,
  loadPlayerGrowthAvatarByPlayerId,
} from "@/lib/ai-growth/playerGrowthAvatarService";
import { getPlayerGrowthTimeline } from "@/lib/ai-growth/getPlayerGrowthTimeline";
import { resolveGrowthPlayerIdForSession } from "@/lib/ai-growth/growthPlayerId";
import {
  applySeasonOvrFromDeltas,
  loadPlayerGrowthOvr,
  syncPlayerOvrFromGrowthSnapshot,
} from "@/lib/ai-growth/playerGrowthOvrService";
import {
  buildEvidenceItems,
  buildReportMetadata,
  formatReportGeneratedAt,
  type EvidenceReportItem,
} from "@/components/ai-growth/growthReportTrust";
import {
  buildCoachReviewContextFromEvent,
  buildVerificationSummaryMerged,
  buildVerifiedReportItems,
  normalizeGrowthEvents,
  type CoachReviewAction,
  type CoachReviewContext,
  type VerifiedReportItem,
} from "@/lib/ai-growth/coachReviewBridge";
import {
  buildComparisonBaselineFromSessions,
  compareGrowthScoreToHistory,
  computeGrowthScore,
  debugGrowthComparisonBaseline,
  formatDimensionScoreDisplay,
  GROWTH_SCORE_WEIGHTS,
  pickPrimaryStrengths,
  type GrowthScoreResult,
} from "@/lib/ai-growth/growthScore";
import {
  growthLetterGradeHint,
  scoreToGrowthLetterGrade,
} from "@/lib/ai-growth/growthLetterGrade";
import { computeGrowthProfileRadar } from "@/lib/ai-growth/growthProfileRadar";
import { GrowthProfileRadarChart } from "@/components/ai-growth/GrowthProfileRadarChart";
import { LiteReportGradeBadge } from "@/components/team/LiteReportGradeBadge";
import { isLiteReportGrade } from "@/lib/team/teamAiAnalysisLite";
import {
  buildMonthlyGrowthTimeline,
} from "@/lib/ai-growth/monthlyGrowthTimeline";
import {
  computeGrowthTrendDashboard,
  loadGrowthHistoryCanonical,
  persistPlayerGrowthSession,
} from "@/lib/ai-growth/playerGrowthHistoryService";
import type { GrowthLevelUpEvent } from "@/lib/ai-growth/growthAvatarLevelUp";
import { syncPlayerGrowthAvatarAfterSession } from "@/lib/ai-growth/syncPlayerGrowthAvatarAfterSession";
import type { GrowthTrendWindow, PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import { tagGrowthEventsHeuristic } from "@/lib/ai-growth/clientGrowthTaggingHeuristic";
import { callRecordPrivacyAuditEvent } from "@/lib/privacy/privacyAuditCallables";
import { GrowthAcademyPlayerSelect } from "@/components/ai-growth/GrowthAcademyPlayerSelect";
import { FiiScoreRationaleCard } from "@/components/ai-growth/FiiScoreRationaleCard";
import { GlossaryQuickBar } from "@/components/glossary/GlossaryQuickBar";
import { GlossaryTooltip } from "@/components/glossary/GlossaryTooltip";
import { TacticalTrainingRecommendationCard } from "@/components/ai-growth/TacticalTrainingRecommendationCard";
import {
  isFiiEngineV1Enabled,
  isGevV1_15Enabled,
  isTacticalAgentV1Enabled,
} from "@/lib/fii/fiiFeatureFlags";
import { growthEventDisplayCode, growthEventDisplayLabel } from "@/lib/gev/growthEventDisplay";
import { useGrowthAcademyPlayerSelect } from "@/hooks/useGrowthAcademyPlayerSelect";
import type { GrowthSelectedPlayer } from "@/lib/ai-growth/growthSelectedPlayer";
import { parseManualTranscriptSegments } from "@/lib/ai-growth/parseManualTranscriptSegments";
import { extractYoutubeVideoId } from "@/lib/youtube/extractYoutubeVideoId";
import {
  canRunYoutubeIngestion,
  canRunYoutubeIngestionOnProd,
  functionsEmulatorConnected,
  ingestionRuntimeLabel,
  isProductionWebHost,
  whisperPipelineMode,
  youtubeIngestionBlockedReason,
} from "@/lib/academy/aiGrowthIngestionRuntime";
import {
  AcademyMp4UploadPanel,
  type AcademyMp4IngestCompletePayload,
} from "@/components/ai-growth/AcademyMp4UploadPanel";
import { YoutubeUrlImportPanel } from "@/components/ai-growth/YoutubeUrlImportPanel";
import { CvRunInternalPanel } from "@/components/ai-growth/cv/CvRunInternalPanel";
import { resolveCvPilotMediaId } from "@/lib/academy/academyCvDevSmoke";
import { teamValidationConsolePath } from "@/lib/team/teamValidationConsoleRoutes";
import { isYoutubeUrlImportBetaEnabled } from "@/lib/academy/youtubeUrlImportRuntime";
import type { MockGrowthEvent, TranscriptSegment } from "@/components/ai-growth/types";

const TREND_WINDOW_OPTIONS: { id: GrowthTrendWindow; label: string }[] = [
  { id: "7d", label: "7일" },
  { id: "30d", label: "30일" },
  { id: "season", label: "시즌" },
];
const REPORT_TONE_OPTIONS: { id: ReportTone; label: string }[] = [
  { id: "reassurance", label: "안심형" },
  { id: "growth", label: "성장형" },
  { id: "technical", label: "기술형" },
];

const STEP_LABELS = ["영상 선정", "자막 입력", "AI 태깅", "코치 검토", "리포트"] as const;

/** 학부모·코치용 — YouTube URL ingestion 실패 시 MP4 경로 안내 */
const YOUTUBE_URL_INGEST_FAIL_PARENT_MSG =
  "유튜브 영상을 가져오지 못했습니다. MP4 업로드로 계속 진행해 주세요.";

const EVENT_HELPER_TEXT: Record<string, string> = {
  SCAN: "공 받기 전 주변 확인 증가",
  PRESS_RESIST: "압박 상황에서 공 지키기/탈출",
  QUICK_RECOVERY: "실수 직후 빠른 재집중",
};

type StepIndex = 1 | 2 | 3 | 4 | 5;
type TranscriptIngestionStatus = "idle" | "extracting" | "transcribing" | "ready" | "failed";
type TranscriptInputMode = "manual" | "ingested";
type IngestionSourceKind = "manual" | "academy_mp4" | "youtube_url" | "demo_coach_sample" | null;
type IngestionVerdict = "idle" | "running" | "whisper" | "mock" | "incomplete" | "failed" | "manual";

type PlayerUiState = "unstarted" | "playing" | "paused" | "buffering" | "ended" | "cued";
type Props = {
  teamId: string;
  teamName?: string;
  embedded?: boolean;
  /** Play / Validation Console deep-link — MP4 업로드 시 Vision matchId 사전 선택 */
  initialMatchId?: string;
  /** /growth/demo — 샘플 카드 선택 시 코치 전사 샘플로 Step 2 자동 진입 */
  demoAutoIngestOnSampleSelect?: boolean;
};

export default function AIGrowthValidationConsole(props: Props) {
  return (
    <ErrorBoundary compact={props.embedded}>
      <AIGrowthValidationConsoleInner {...props} />
    </ErrorBoundary>
  );
}

function AIGrowthValidationConsoleInner({
  teamId,
  teamName,
  embedded = false,
  initialMatchId,
  demoAutoIngestOnSampleSelect = false,
}: Props) {
  const [currentStep, setCurrentStep] = useState<StepIndex>(1);
  const defaultDemoVideo =
    MOCK_VIDEO_OPTIONS.find((v) => v.demoIngest === "coach_sample") ?? MOCK_VIDEO_OPTIONS[0];
  const [selectedVideoId, setSelectedVideoId] = useState(defaultDemoVideo?.id ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(defaultDemoVideo?.url ?? MOCK_YOUTUBE_URL);
  const {
    players: academyPlayersForGrowth,
    selectedPlayer,
    selectedPlayerId,
    setSelectedPlayerId,
    loading: academyPlayersLoading,
    error: academyPlayersError,
  } = useGrowthAcademyPlayerSelect(teamId);
  const playerName = selectedPlayer?.displayName ?? "";
  const growthPlayerId = selectedPlayer?.playerId;
  const [subtitleText, setSubtitleText] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [ingestionStatus, setIngestionStatus] = useState<TranscriptIngestionStatus>("idle");
  const [ingestionError, setIngestionError] = useState<string | null>(null);
  const [ingestionNotice, setIngestionNotice] = useState<string | null>(null);
  const [ingestionJobId, setIngestionJobId] = useState<string | null>(null);
  const [ingestionProvider, setIngestionProvider] = useState<string | null>(null);
  const [ingestionAudioPath, setIngestionAudioPath] = useState<string | null>(null);
  const [ingestionDuration, setIngestionDuration] = useState<number | null>(null);
  const [ingestionSegmentCount, setIngestionSegmentCount] = useState<number | null>(null);
  const [ingestionElapsedMs, setIngestionElapsedMs] = useState<number | null>(null);
  const [ingestionTranscriptLanguage, setIngestionTranscriptLanguage] = useState<string | null>(null);
  const [ingestionFailurePhase, setIngestionFailurePhase] = useState<"extract" | "transcribe" | "timeout" | null>(
    null
  );
  const [runtimeProbeStatus, setRuntimeProbeStatus] = useState<string | null>(null);
  const [pendingSeekSeconds, setPendingSeekSeconds] = useState<number | null>(null);
  const [seekRequest, setSeekRequest] = useState<{ seconds: number; token: number } | null>(null);
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState(0);
  const [playerUiState, setPlayerUiState] = useState<PlayerUiState>("unstarted");
  const [inputMode, setInputMode] = useState<TranscriptInputMode>("manual");
  const [ingestionSource, setIngestionSource] = useState<IngestionSourceKind>(null);
  const [events, setEvents] = useState<MockGrowthEvent[]>([]);
  const [taggingStatus, setTaggingStatus] = useState<"idle" | "running" | "ready" | "failed">("idle");
  const [taggingProvider, setTaggingProvider] = useState<string | null>(null);
  const [taggingError, setTaggingError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [reviewContexts, setReviewContexts] = useState<Record<string, CoachReviewContext>>({});
  const [autoSeekSelectedEvent, setAutoSeekSelectedEvent] = useState(true);
  const [confusionNote, setConfusionNote] = useState("");
  const [readAloudNote, setReadAloudNote] = useState("");
  const [sampleIngestRunning, setSampleIngestRunning] = useState(false);

  const { avatar: headerGrowthAvatar, loading: headerGrowthAvatarLoading } = usePlayerGrowthAvatar(
    teamId,
    playerName,
    growthPlayerId
  );

  const verifiedReportItems = useMemo(
    () => buildVerifiedReportItems(events, reviewContexts, transcriptSegments),
    [events, reviewContexts, transcriptSegments]
  );
  const verificationSummary = useMemo(
    () => buildVerificationSummaryMerged(events, reviewContexts),
    [events, reviewContexts]
  );
  const topEventTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of verifiedReportItems) {
      counts.set(item.event.eventType, (counts.get(item.event.eventType) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [verifiedReportItems]);
  const youtubeVideoId = useMemo(() => extractYoutubeVideoId(youtubeUrl), [youtubeUrl]);
  const ingestionUrlWarning = useMemo(() => {
    if (!youtubeUrl.trim()) return null;
    const selected = MOCK_VIDEO_OPTIONS.find((v) => v.id === selectedVideoId);
    if (isCoachSampleDemoOption(selected)) return null;
    if (youtubeUrl.includes("RhjpHnp3SRA")) {
      return "선택한 영상은 매우 깁니다. 심사 데모는 「유소년 훈련 #1」 샘플 카드(원클릭)를 사용하세요.";
    }
    return null;
  }, [youtubeUrl, selectedVideoId]);
  const seekTokenRef = useRef(0);
  const activeTranscriptSegmentId = useMemo(() => {
    const found = transcriptSegments.find(
      (segment) => currentPlaybackSeconds >= segment.start && currentPlaybackSeconds <= segment.end
    );
    return found?.id ?? null;
  }, [currentPlaybackSeconds, transcriptSegments]);
  const activeEventId = useMemo(() => {
    const found = events.find(
      (event) =>
        currentPlaybackSeconds >= event.transcriptStart && currentPlaybackSeconds <= event.transcriptEnd
    );
    return found?.id ?? null;
  }, [currentPlaybackSeconds, events]);
  const ingestionVerdict = useMemo(
    () =>
      resolveIngestionVerdict({
        inputMode,
        ingestionStatus,
        ingestionProvider,
        ingestionSegmentCount,
        transcriptSegments,
      }),
    [inputMode, ingestionStatus, ingestionProvider, ingestionSegmentCount, transcriptSegments]
  );

  const timelineDurationHint = useMemo(() => {
    const segmentEnd = transcriptSegments.reduce((max, segment) => Math.max(max, segment.end), 0);
    const eventEnd = events.reduce((max, event) => Math.max(max, event.transcriptEnd), 0);
    return Math.max(segmentEnd, eventEnd, 1);
  }, [events, transcriptSegments]);

  function requestSeek(seconds: number) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    seekTokenRef.current += 1;
    setPendingSeekSeconds(safeSeconds);
    setSeekRequest({ seconds: safeSeconds, token: seekTokenRef.current });
  }

  function handleEventFocus(eventId: string, seconds: number) {
    setSelectedEventId(eventId);
    requestSeek(seconds);
  }

  useEffect(() => {
    if (!autoSeekSelectedEvent) return;
    if (currentStep !== 4) return;
    if (!selectedEventId) return;
    const selected = events.find((event) => event.id === selectedEventId);
    if (!selected) return;
    requestSeek(selected.transcriptStart);
  }, [autoSeekSelectedEvent, currentStep, events, selectedEventId]);

  async function runCoachSampleIngest(option: MockVideoOption) {
    const segments = option.demoTranscriptSegments ?? MOCK_TRANSCRIPT_SEGMENTS;
    setSampleIngestRunning(true);
    setIngestionError(null);
    setIngestionNotice(null);
    setIngestionFailurePhase(null);
    setIngestionStatus("transcribing");
    setIngestionProvider(null);
    await new Promise((r) => setTimeout(r, 650));

    setIngestionSource("demo_coach_sample");
    setInputMode("ingested");
    setIngestionJobId(`demo-${option.id}`);
    setIngestionProvider("demo-coach-verified");
    setIngestionAudioPath(null);
    setIngestionDuration(segments.reduce((max, s) => Math.max(max, s.end), 0));
    setIngestionSegmentCount(segments.length);
    setIngestionElapsedMs(650);
    setIngestionTranscriptLanguage(option.languageHint === "en" ? "en" : "ko");
    setTranscriptSegments(segments);
    syncTranscriptText(segments);
    setRuntimeProbeStatus("whisper_completed");
    setIngestionStatus("ready");
    setSampleIngestRunning(false);
    setCurrentStep(2);

    console.info("[DEMO-SAMPLE] coach transcript applied", {
      sampleId: option.id,
      segmentCount: segments.length,
    });
  }

  function selectVideo(id: string) {
    const found = MOCK_VIDEO_OPTIONS.find((v) => v.id === id);
    setSelectedVideoId(id);
    if (found) {
      setYoutubeUrl(found.url);
      if (isCoachSampleDemoOption(found) && demoAutoIngestOnSampleSelect) {
        void runCoachSampleIngest(found);
      }
    }
  }

  function syncTranscriptText(segments: TranscriptSegment[]) {
    setSubtitleText(segments.map((segment) => `[${formatSeconds(segment.start)}-${formatSeconds(segment.end)}] ${segment.text}`).join("\n"));
  }

  async function runMockIngestion() {
    const blocked = youtubeIngestionBlockedReason();
    if (blocked) {
      setInputMode("manual");
      setIngestionStatus("idle");
      setIngestionFailurePhase(null);
      setRuntimeProbeStatus(null);
      setIngestionProvider(null);
      setIngestionError(null);
      setIngestionNotice(`${YOUTUBE_URL_INGEST_FAIL_PARENT_MSG}\n\n${blocked}`);
      console.info("[AI-INGEST] ingestion unavailable (expected)", blocked);
      return;
    }

    const pipelineStartedAt = Date.now();
    console.info("[AI-INGEST] E2E start", { teamId, youtubeUrl, currentStep });
    setInputMode("ingested");
    setIngestionError(null);
    setIngestionNotice(null);
    setIngestionFailurePhase(null);
    setIngestionProvider(null);
    setIngestionAudioPath(null);
    setIngestionDuration(null);
    setIngestionSegmentCount(null);
    setIngestionElapsedMs(null);
    setIngestionTranscriptLanguage(null);
    setTranscriptSegments([]);
    setSubtitleText("");
    setIngestionStatus("extracting");
    try {
      setIngestionStatus("transcribing");
      const started = await callStartYoutubeIngestion({ teamId, youtubeUrl });
      const directSegments = started.transcriptSegments ?? [];

      if (!directSegments.length) {
        throw new Error(
          "[transcribe] 자막 segment가 비어 있습니다. functions/.env에서 YAGO_INGEST_EXTRACT_ONLY를 제거했는지 확인해주세요."
        );
      }

      const elapsedMs =
        typeof started.pipelineElapsedMs === "number"
          ? started.pipelineElapsedMs
          : typeof started.transcribeElapsedMs === "number"
            ? started.transcribeElapsedMs
            : Date.now() - pipelineStartedAt;

      setIngestionJobId(started.jobId);
      setIngestionProvider(started.provider ?? "whisper");
      setIngestionAudioPath(started.audioPath ?? null);
      setIngestionDuration(typeof started.duration === "number" ? started.duration : null);
      setIngestionSegmentCount(
        typeof started.segmentCount === "number" ? started.segmentCount : directSegments.length
      );
      setIngestionElapsedMs(elapsedMs);
      const lang =
        typeof started.transcriptLanguage === "string"
          ? started.transcriptLanguage
          : inferTranscriptLanguageFromSegments(directSegments);
      setIngestionTranscriptLanguage(lang);
      setTranscriptSegments(directSegments);
      syncTranscriptText(directSegments);
      setRuntimeProbeStatus("whisper_completed");
      setIngestionStatus("ready");

      console.info("[AI-INGEST] E2E success", {
        provider: started.provider,
        segmentCount: directSegments.length,
        elapsedMs,
        first: directSegments[0],
        last: directSegments[directSegments.length - 1],
      });
    } catch (error) {
      setIngestionStatus("failed");
      const callable = parseIngestionCallableError(error);
      const { message, phase } = classifyIngestionError(error);
      setIngestionFailurePhase(phase);
      setIngestionNotice(YOUTUBE_URL_INGEST_FAIL_PARENT_MSG);
      setIngestionError(message);
      console.error("[AI-INGEST] E2E failed — phase:", phase ?? "(unknown)");
      console.error("[AI-INGEST] E2E failed — callableCode:", callable.code);
      console.error("[AI-INGEST] E2E failed — callableMessage:", callable.message);
      if (callable.details !== undefined) {
        console.error("[AI-INGEST] E2E failed — callableDetails:", callable.details);
      }
      const hint =
        callable.code === "functions/deadline-exceeded" || callable.code.includes("deadline")
          ? "timeout — 짧은 영상(jNQXAC9IVRw)으로 재시도"
          : callable.code === "functions/internal"
            ? !canRunYoutubeIngestion()
              ? youtubeIngestionBlockedReason() ??
                "운영 앱에서는 자동 전사를 사용할 수 없습니다. 자막을 직접 입력해 주세요."
              : "긴 영상 extract timeout 가능성 — 짧은 YouTube URL로 재시도"
            : callable.code === "functions/not-found"
              ? "emulator 재시작 + cd functions && npm run build"
              : callable.message.includes("[worker]")
                ? "yago-worker npm start (8787)"
                : !functionsEmulatorConnected()
                  ? "VITE_USE_EMULATOR=true + localhost"
                  : "F12 Network → startYoutubeIngestion Response";
      console.error("[AI-INGEST] E2E failed — hint:", hint);
    }
  }

  function applyAcademyMp4IngestResult(
    result: AcademyMp4IngestCompletePayload,
    source: "academy_mp4" | "youtube_url" = "academy_mp4"
  ) {
    const segments = result.transcriptSegments ?? [];
    if (!segments.length) return;

    setIngestionSource(source);
    setInputMode("ingested");
    setIngestionError(null);
    setIngestionNotice(null);
    setIngestionFailurePhase(null);
    setIngestionJobId(result.mediaId);
    setIngestionProvider(result.provider);
    setIngestionAudioPath(result.storagePath);
    setIngestionDuration(result.durationSeconds);
    setIngestionSegmentCount(result.segmentCount);
    setIngestionElapsedMs(result.pipelineElapsedMs);
    setIngestionTranscriptLanguage(result.transcriptLanguage);
    setTranscriptSegments(segments);
    syncTranscriptText(segments);
    setRuntimeProbeStatus("whisper_completed");
    setIngestionStatus("ready");

    console.info("[ACADEMY-MP4] console transcript applied", {
      mediaId: result.mediaId,
      provider: result.provider,
      segmentCount: result.segmentCount,
    });
  }

  function handleSubtitleChange(value: string) {
    setSubtitleText(value);
    const parsed = parseManualTranscriptSegments(value);
    setTranscriptSegments(parsed);
    if (parsed.length) {
      setInputMode("manual");
      setIngestionError(null);
      setIngestionNotice(null);
    }
  }

  async function runGrowthTagging() {
    let segments = transcriptSegments;
    if (!segments.length && subtitleText.trim()) {
      segments = parseManualTranscriptSegments(subtitleText);
      if (segments.length) {
        setTranscriptSegments(segments);
        setInputMode("manual");
      }
    }
    if (!segments.length) {
      setTaggingError("코치 말 자막을 입력해 주세요. (한 줄에 한 문장, 예: 좋아, 주변 보고 패스해봐)");
      setCurrentStep(2);
      return;
    }
    setTaggingStatus("running");
    setTaggingError(null);
    setTaggingProvider(null);
    try {
      if (!functionsEmulatorConnected()) {
        const tagged = normalizeGrowthEvents(
          tagGrowthEventsHeuristic(segments).map((e) => ({ ...e, reviewStatus: "candidate" as const }))
        );
        if (!tagged.length) {
          setTaggingStatus("failed");
          setTaggingError(
            isGevV1_15Enabled()
              ? "키워드가 포함된 코치 코멘트를 입력해 주세요. (예: 공간 창출, 압박 탈출, 전환, 커버, 세컨드 볼)"
              : "키워드가 포함된 코치 코멘트를 입력해 주세요. (예: 주변, 압박, 리커버리, 실수 후 따라가)"
          );
          return;
        }
        setReviewContexts({});
        setEvents(tagged);
        setTaggingProvider("heuristic-client");
        setTaggingStatus("ready");
        setSelectedEventId(tagged[0]?.id ?? null);
        setCurrentStep(3);
        return;
      }

      const result = await callRunTranscriptGrowthTagging({
        teamId,
        transcriptSegments: segments,
        videoDurationSeconds: ingestionDuration ?? undefined,
      });
      setReviewContexts({});
      const tagged = normalizeGrowthEvents(
        result.events.map((e) => ({ ...e, reviewStatus: "candidate" as const }))
      );
      setEvents(tagged);
      setTaggingProvider(result.provider);
      setTaggingStatus("ready");
      setSelectedEventId(tagged[0]?.id ?? null);
      setCurrentStep(3);
    } catch (error) {
      setTaggingStatus("failed");
      const parsed = parseTaggingCallableError(error);
      setTaggingError(parsed.message);
      console.error("[AI-TAG] tagging failed", parsed);
    }
  }

  function fillSampleCoachTranscript() {
    const text = MOCK_TRANSCRIPT_SEGMENTS.map((s) => s.text).join("\n");
    handleSubtitleChange(text);
    setTaggingError(null);
    setIngestionNotice(null);
    setIngestionError(null);
  }

  function loadDemoTaggingSamples() {
    setTranscriptSegments(MOCK_TRANSCRIPT_SEGMENTS);
    syncTranscriptText(MOCK_TRANSCRIPT_SEGMENTS);
    setInputMode("manual");
    setTaggingError(null);
    setReviewContexts({});
    const demo = normalizeGrowthEvents(
      MOCK_GROWTH_EVENTS.map((e) => ({ ...e, reviewStatus: "candidate" as const }))
    );
    setEvents(demo);
    setTaggingProvider("demo-sample");
    setTaggingStatus("ready");
    setSelectedEventId(demo[0]?.id ?? null);
    setCurrentStep(3);
  }

  function applyCoachReviewAction(eventId: string, action: CoachReviewAction, coachNote?: string) {
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      console.warn("[AI-GROWTH] applyCoachReviewAction: event not found", { eventId, eventIds: events.map((e) => e.id) });
      return;
    }
    const transcript = buildTranscriptSnippet(event, transcriptSegments);
    const nextStatus: MockGrowthEvent["reviewStatus"] =
      action === "rejected" ? "rejected" : "confirmed";

    setEvents((prev) =>
      prev.map((item) =>
        item.id === eventId
          ? {
              ...item,
              reviewStatus: nextStatus,
              ...(action === "edited" && coachNote?.trim() ? { coachNote: coachNote.trim() } : {}),
            }
          : item
      )
    );

    if (action === "rejected") {
      setReviewContexts((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return {
          ...next,
          [eventId]: buildCoachReviewContextFromEvent({
            event,
            action: "rejected",
            transcript,
            videoTimestamp: Math.floor(currentPlaybackSeconds),
            coachNote,
          }),
        };
      });
      return;
    }

    const context = buildCoachReviewContextFromEvent({
      event,
      action,
      transcript,
      videoTimestamp: Math.floor(currentPlaybackSeconds),
      coachNote,
    });
    setReviewContexts((prev) => ({ ...prev, [eventId]: context }));
  }

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 space-y-4 rounded-2xl bg-violet-50/60 sm:space-y-5",
        embedded
          ? "max-w-none px-0 py-2 sm:max-w-[1000px] sm:px-4 sm:py-5"
          : "max-w-[1000px] p-3 sm:p-6"
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900">YAGO Growth</h2>
          <p className="mt-1 text-xs tracking-wide text-violet-700">
            AI Validation Platform · Week 1
            {teamName ? ` · ${teamName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-900">
            실제 AI 작동
          </span>
          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
            VALIDATION ONLY
          </span>
        </div>
      </header>

      {(headerGrowthAvatar || headerGrowthAvatarLoading) && playerName.trim() ? (
        <PlayerGrowthAvatarCard
          playerName={playerName}
          avatar={headerGrowthAvatar}
          loading={headerGrowthAvatarLoading}
          variant="inline"
        />
      ) : null}

      <Stepper currentStep={currentStep} />

      <section
        className={cn(
          "min-w-0 shadow-sm",
          embedded
            ? "rounded-none border-0 bg-transparent p-0 sm:rounded-3xl sm:border sm:border-violet-200 sm:bg-white sm:p-5"
            : "rounded-3xl border border-violet-200 bg-white p-3 sm:p-6"
        )}
      >
        {(currentStep === 3 || currentStep === 4 || currentStep === 5) && youtubeVideoId ? (
          <div className="mb-5">
            <YouTubeSyncPlayer
              videoId={youtubeVideoId}
              seekRequest={seekRequest}
              currentPlaybackSeconds={currentPlaybackSeconds}
              onTimeUpdate={setCurrentPlaybackSeconds}
              playerUiState={playerUiState}
              onPlayerStateChange={setPlayerUiState}
              events={events}
              timelineDurationHint={timelineDurationHint}
              title="영상 + 타임라인 검토"
            />
          </div>
        ) : null}
        {currentStep === 1 && (
          <Step1Panel
            teamId={teamId}
            embedded={embedded}
            growthPlayerId={growthPlayerId}
            initialMatchId={initialMatchId}
            initialMediaId={ingestionJobId}
            youtubeBetaEnabled={isYoutubeUrlImportBetaEnabled()}
            selectedVideoId={selectedVideoId}
            youtubeUrl={youtubeUrl}
            playerName={playerName}
            academyPlayers={academyPlayersForGrowth}
            selectedPlayerId={selectedPlayerId}
            academyPlayersLoading={academyPlayersLoading}
            academyPlayersError={academyPlayersError}
            onSelectPlayerId={setSelectedPlayerId}
            sampleIngestRunning={sampleIngestRunning}
            demoAutoIngestOnSampleSelect={demoAutoIngestOnSampleSelect}
            onSelectVideo={selectVideo}
            onRunSampleAnalysis={(id) => {
              const option = MOCK_VIDEO_OPTIONS.find((v) => v.id === id);
              if (option && isCoachSampleDemoOption(option)) {
                void runCoachSampleIngest(option);
              }
            }}
            onChangeUrl={setYoutubeUrl}
            onYoutubeIngestComplete={(payload) => {
              applyAcademyMp4IngestResult(payload, "youtube_url");
              setSeekRequest(null);
              setPendingSeekSeconds(null);
              setCurrentStep(2);
            }}
            onMp4IngestComplete={(payload) => {
              applyAcademyMp4IngestResult(payload, "academy_mp4");
              setSeekRequest(null);
              setPendingSeekSeconds(null);
              setCurrentStep(2);
            }}
            onNext={() => {
              setSeekRequest(null);
              setPendingSeekSeconds(null);
              setCurrentStep(2);
            }}
          />
        )}
        {currentStep === 2 && (
          <Step2Panel
            teamId={teamId}
            growthPlayerId={growthPlayerId}
            initialMatchId={initialMatchId}
            onAcademyMp4IngestComplete={applyAcademyMp4IngestResult}
            subtitleText={subtitleText}
            onChangeSubtitle={handleSubtitleChange}
            onRunIngestion={runMockIngestion}
            onRunTagging={() => void runGrowthTagging()}
            taggingStatus={taggingStatus}
            taggingError={taggingError}
            transcriptSegments={transcriptSegments}
            ingestionStatus={ingestionStatus}
            ingestionError={ingestionError}
            ingestionNotice={ingestionNotice}
            ingestionJobId={ingestionJobId}
            ingestionProvider={ingestionProvider}
            ingestionAudioPath={ingestionAudioPath}
            ingestionDuration={ingestionDuration}
            ingestionSegmentCount={ingestionSegmentCount}
            ingestionElapsedMs={ingestionElapsedMs}
            ingestionTranscriptLanguage={ingestionTranscriptLanguage}
            ingestionFailurePhase={ingestionFailurePhase}
            ingestionVerdict={ingestionVerdict}
            ingestionUrlWarning={ingestionUrlWarning}
            runtimeProbeStatus={runtimeProbeStatus}
            pendingSeekSeconds={pendingSeekSeconds}
            activeTranscriptSegmentId={activeTranscriptSegmentId}
            inputMode={inputMode}
            ingestionSource={ingestionSource}
            youtubeUrl={youtubeUrl}
            onSeekFromTranscript={requestSeek}
            onBack={() => setCurrentStep(1)}
            onFillSampleTranscript={fillSampleCoachTranscript}
            onDemoTagging={loadDemoTaggingSamples}
          />
        )}
        {currentStep === 3 && (
          <Step3Panel
            events={events}
            taggingProvider={taggingProvider}
            activeEventId={activeEventId}
            selectedEventId={selectedEventId}
            onFocusEvent={handleEventFocus}
            onLoadDemoSamples={loadDemoTaggingSamples}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}
        {currentStep === 4 && (
          <Step4Panel
            events={events}
            selectedEventId={selectedEventId}
            currentPlaybackSeconds={currentPlaybackSeconds}
            transcriptSegments={transcriptSegments}
            reviewContexts={reviewContexts}
            autoSeekSelectedEvent={autoSeekSelectedEvent}
            confusionNote={confusionNote}
            onFocusEvent={handleEventFocus}
            onApplyReview={applyCoachReviewAction}
            onToggleAutoSeek={setAutoSeekSelectedEvent}
            onChangeConfusionNote={setConfusionNote}
            verifiedCount={verifiedReportItems.length}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
          />
        )}
        {currentStep === 5 && (
          <Step5Panel
            embedded={embedded}
            teamId={teamId}
            teamName={teamName}
            playerName={playerName}
            growthPlayerId={growthPlayerId}
            videoId={youtubeVideoId}
            mediaId={ingestionJobId}
            reviewContexts={reviewContexts}
            verifiedItems={verifiedReportItems}
            verification={verificationSummary}
            selectedEventId={selectedEventId}
            topEventTypes={topEventTypes}
            confusionNote={confusionNote}
            readAloudNote={readAloudNote}
            onSelectEvent={setSelectedEventId}
            onSeekFromReport={requestSeek}
            onChangeReadAloudNote={setReadAloudNote}
            onBack={() => setCurrentStep(4)}
          />
        )}
      </section>
      {!embedded ? null : (
        <p className="text-[11px] text-gray-500">
          AI 제안은 참고용이며, 최종 판단은 코치가 수행합니다.
        </p>
      )}
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: StepIndex }) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-white px-3 py-3">
      <ol className="grid grid-cols-5 gap-2">
        {STEP_LABELS.map((label, idx) => {
          const step = (idx + 1) as StepIndex;
          const done = step < currentStep;
          const current = step === currentStep;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  done && "bg-violet-600 text-white",
                  current && "bg-black text-white",
                  !done && !current && "bg-gray-100 text-gray-600"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step}
              </span>
              <span className={cn("text-xs font-semibold", current ? "text-gray-900" : "text-gray-600")}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Step1Panel({
  teamId,
  embedded,
  growthPlayerId,
  initialMatchId,
  initialMediaId,
  youtubeBetaEnabled,
  selectedVideoId,
  youtubeUrl,
  playerName,
  academyPlayers,
  selectedPlayerId,
  academyPlayersLoading,
  academyPlayersError,
  onSelectPlayerId,
  sampleIngestRunning,
  demoAutoIngestOnSampleSelect,
  onSelectVideo,
  onRunSampleAnalysis,
  onChangeUrl,
  onYoutubeIngestComplete,
  onMp4IngestComplete,
  onNext,
}: {
  teamId: string;
  embedded?: boolean;
  growthPlayerId?: string;
  initialMatchId?: string;
  initialMediaId?: string | null;
  youtubeBetaEnabled: boolean;
  selectedVideoId: string;
  youtubeUrl: string;
  playerName: string;
  academyPlayers: GrowthSelectedPlayer[];
  selectedPlayerId: string;
  academyPlayersLoading: boolean;
  academyPlayersError: string | null;
  onSelectPlayerId: (playerId: string) => void;
  sampleIngestRunning: boolean;
  demoAutoIngestOnSampleSelect: boolean;
  onSelectVideo: (id: string) => void;
  onRunSampleAnalysis: (id: string) => void;
  onChangeUrl: (v: string) => void;
  onYoutubeIngestComplete: (payload: AcademyMp4IngestCompletePayload) => void;
  onMp4IngestComplete: (payload: AcademyMp4IngestCompletePayload) => void;
  onNext: () => void;
}) {
  const cvPilotMediaId = resolveCvPilotMediaId();
  const [step1InputPath, setStep1InputPath] = useState<"youtube" | "mp4">(
    (initialMatchId?.trim() || cvPilotMediaId || embedded) ? "mp4" : "youtube"
  );

  const showMp4Path = step1InputPath === "mp4";
  const selectedOption = MOCK_VIDEO_OPTIONS.find((v) => v.id === selectedVideoId);
  const isCoachSample = isCoachSampleDemoOption(selectedOption);
  const showYoutubePanel = youtubeBetaEnabled && !showMp4Path && !isCoachSample;

  useEffect(() => {
    if (step1InputPath !== "mp4") return;
    requestAnimationFrame(() => {
      document
        .getElementById("academy-mp4-upload-anchor")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [step1InputPath]);

  return (
    <div className="space-y-4">
      {embedded ? (
        <p className="rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-xs text-violet-900">
          팀 허브 임베드 뷰입니다. MP4 · CV 전체 파이프라인은{" "}
          <Link
            to={teamValidationConsolePath(teamId)}
            className="font-semibold underline underline-offset-2"
          >
            Validation Console (전체 화면)
          </Link>
          에서 실행하세요.
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">STEP 1 — 영상 분석</h3>
          <p className="mt-2 text-sm text-gray-700">
            <strong>심사용 샘플 카드</strong>를 선택하면 코치 전사 데이터로 Step 2까지 바로 이동합니다 (YouTube
            다운로드·yt-dlp 미사용).
          </p>
          <p className="mt-1 text-sm text-gray-600">
            실제 Whisper 연동은 <strong>MP4 업로드</strong> 또는 개발용 URL 경로를 사용하세요.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
          오늘 바로 가능
        </span>
      </div>

      <GrowthAcademyPlayerSelect
        players={academyPlayers}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayerId={onSelectPlayerId}
        loading={academyPlayersLoading}
        error={academyPlayersError}
      />

      <div>
        <p className="text-sm font-semibold text-gray-800">심사·데모 샘플 영상</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {MOCK_VIDEO_OPTIONS.map((video) => {
            const selected = video.id === selectedVideoId;
            const langLabel =
              video.languageHint === "ko" ? "KO" : video.languageHint === "en" ? "EN" : null;
            const isSample = isCoachSampleDemoOption(video);
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => onSelectVideo(video.id)}
                disabled={sampleIngestRunning}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition",
                  selected
                    ? "border-violet-400 bg-violet-50 shadow-sm ring-2 ring-violet-200"
                    : "border-gray-200 bg-white hover:border-violet-200",
                  sampleIngestRunning && "opacity-60"
                )}
              >
                <p className="flex flex-wrap items-center gap-2 text-base font-bold text-gray-900">
                  {video.title}
                  {langLabel ? (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                      {langLabel}
                    </span>
                  ) : null}
                  {isSample ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      원클릭 샘플
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-gray-500">{video.videoId}</p>
                <p className="mt-2 text-xs text-gray-700">{video.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {isCoachSample && selectedOption ? (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/80 p-4">
          <p className="text-sm font-bold text-emerald-950">선택: {selectedOption.title}</p>
          <p className="mt-1 text-xs text-emerald-900">
            코치 검증용 샘플 전사 · Whisper 파이프라인 데모 (yt-dlp 없음)
          </p>
          {sampleIngestRunning ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              샘플 전사 적용 중…
            </p>
          ) : demoAutoIngestOnSampleSelect ? (
            <p className="mt-2 text-xs text-emerald-800">카드 선택 시 자동으로 Step 2로 이동합니다.</p>
          ) : (
            <Button
              type="button"
              className="mt-3 h-11 w-full bg-emerald-600 font-bold hover:bg-emerald-500 sm:w-auto"
              onClick={() => onRunSampleAnalysis(selectedOption.id)}
            >
              샘플 분석 시작
            </Button>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-emerald-400 text-emerald-900"
              onClick={() => setStep1InputPath("mp4")}
            >
              MP4 직접 업로드 (Whisper · CV)
            </Button>
          </div>
        </div>
      ) : null}

      {showYoutubePanel ? (
        <>
          <p className="text-center text-xs font-medium text-gray-400">고급 — YouTube URL (yt-dlp, 불안정)</p>
          <YoutubeUrlImportPanel
            teamId={teamId}
            playerName={playerName}
            youtubeUrl={youtubeUrl}
            onChangeUrl={onChangeUrl}
            onIngestComplete={onYoutubeIngestComplete}
            onFallbackToMp4={() => setStep1InputPath("mp4")}
          />
        </>
      ) : null}

      {cvPilotMediaId ? (
        <p className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800">
          CV pilot — cvMediaId{" "}
          <code className="font-mono text-[10px]">{cvPilotMediaId}</code>
          {" · "}
          Step 5에서 <strong>CV Interpretation Pilot (J5/J6/I8)</strong> 패널을 확인하세요.
        </p>
      ) : null}

      {showMp4Path ? (
        <div id="academy-mp4-upload-anchor" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-emerald-900">MP4 직접 업로드 (Whisper 분석)</p>
            {youtubeBetaEnabled ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-violet-800"
                onClick={() => setStep1InputPath("youtube")}
              >
                ← YouTube URL로 돌아가기
              </Button>
            ) : null}
          </div>
          <AcademyMp4UploadPanel
            teamId={teamId}
            playerId={growthPlayerId}
            matchId={initialMatchId}
            initialMediaId={initialMediaId}
            onIngestComplete={onMp4IngestComplete}
          />
        </div>
      ) : null}

      {!showMp4Path ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setStep1InputPath("mp4")}
          >
            MP4 파일로 분석하기 (실제 Whisper)
          </Button>
        </div>
      ) : null}

      {!isCoachSample ? (
        <Button
          type="button"
          variant="outline"
          onClick={onNext}
          disabled={!playerName.trim() || academyPlayersLoading}
          className="h-11 w-full text-sm font-semibold"
        >
          다음 — 자막 입력 (수동·MP4 경로) →
        </Button>
      ) : null}
      <p className="text-xs text-gray-500">AI 제안은 참고용이며, 최종 판단은 코치가 수행합니다.</p>
    </div>
  );
}

function Step2Panel({
  teamId,
  growthPlayerId,
  initialMatchId,
  onAcademyMp4IngestComplete,
  subtitleText,
  onChangeSubtitle,
  onRunIngestion,
  onRunTagging,
  transcriptSegments,
  ingestionStatus,
  ingestionError,
  ingestionNotice,
  ingestionJobId,
  ingestionProvider,
  ingestionAudioPath,
  ingestionDuration,
  ingestionSegmentCount,
  ingestionElapsedMs,
  ingestionTranscriptLanguage,
  ingestionFailurePhase,
  ingestionVerdict,
  ingestionUrlWarning,
  runtimeProbeStatus,
  pendingSeekSeconds,
  activeTranscriptSegmentId,
  inputMode,
  ingestionSource,
  youtubeUrl,
  onSeekFromTranscript,
  onBack,
  onFillSampleTranscript,
  onDemoTagging,
  taggingStatus,
  taggingError,
}: {
  teamId: string;
  growthPlayerId?: string;
  initialMatchId?: string;
  onAcademyMp4IngestComplete: (payload: AcademyMp4IngestCompletePayload) => void;
  subtitleText: string;
  onChangeSubtitle: (v: string) => void;
  onRunIngestion: () => Promise<void>;
  onRunTagging: () => void;
  taggingStatus: "idle" | "running" | "ready" | "failed";
  taggingError: string | null;
  transcriptSegments: TranscriptSegment[];
  ingestionStatus: TranscriptIngestionStatus;
  ingestionError: string | null;
  ingestionNotice: string | null;
  ingestionJobId: string | null;
  ingestionProvider: string | null;
  ingestionAudioPath: string | null;
  ingestionDuration: number | null;
  ingestionSegmentCount: number | null;
  ingestionElapsedMs: number | null;
  ingestionTranscriptLanguage: string | null;
  ingestionFailurePhase: "extract" | "transcribe" | "timeout" | null;
  ingestionVerdict: IngestionVerdict;
  ingestionUrlWarning: string | null;
  runtimeProbeStatus: string | null;
  pendingSeekSeconds: number | null;
  activeTranscriptSegmentId: string | null;
  inputMode: TranscriptInputMode;
  ingestionSource: IngestionSourceKind;
  youtubeUrl: string;
  onSeekFromTranscript: (seconds: number) => void;
  onBack: () => void;
  onFillSampleTranscript: () => void;
  onDemoTagging: () => void;
}) {
  const segmentRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const ingestionNoticeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeTranscriptSegmentId) return;
    const target = segmentRefs.current[activeTranscriptSegmentId];
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeTranscriptSegmentId]);

  useEffect(() => {
    console.info("[AI-GROWTH pipeline]", {
      host: typeof window !== "undefined" ? window.location.hostname : "ssr",
      mode: whisperPipelineMode(),
      canIngest: canRunYoutubeIngestion(),
      emulator: functionsEmulatorConnected(),
      verdict: ingestionVerdict,
      inputMode,
      provider: ingestionProvider,
      segmentCount: ingestionSegmentCount ?? transcriptSegments.length,
    });
  }, [
    ingestionVerdict,
    inputMode,
    ingestionProvider,
    ingestionSegmentCount,
    transcriptSegments.length,
  ]);

  useEffect(() => {
    if (!ingestionNotice) return;
    ingestionNoticeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [ingestionNotice]);

  const statusLabel: Record<TranscriptIngestionStatus, string> = {
    idle: "대기 중",
    extracting: "오디오 추출 중 (yt-dlp)",
    transcribing: "Whisper 전사 생성 중",
    ready: "Transcript 준비 완료",
    failed: "처리 실패",
  };
  const statusDetail =
    runtimeProbeStatus === "whisper_completed"
      ? "Whisper 자막 생성 완료"
      : statusLabel[ingestionStatus];
  const isProcessing = ingestionStatus === "extracting" || ingestionStatus === "transcribing";
  const verdictMeta: Record<
    IngestionVerdict,
    { label: string; className: string; hint: string }
  > = {
    idle: {
      label: "대기",
      className: "border-gray-200 bg-gray-50 text-gray-700",
      hint: isProductionWebHost()
        ? "「샘플 코치 말 넣기」로 데모 자막을 넣거나, 직접 입력 후 「AI 태깅 실행」을 사용하세요."
        : "「URL 기반 transcript 가져오기」를 눌러 Whisper 파이프라인을 실행하세요.",
    },
    running: {
      label: "처리 중",
      className: "border-blue-200 bg-blue-50 text-blue-900",
      hint: "yt-dlp → ffmpeg → Whisper 순서로 처리 중입니다. F12 Console에서 [AI-INGEST] 로그를 확인하세요.",
    },
    whisper: {
      label: "Whisper 연동됨",
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
      hint:
        "Whisper 전사 완료. 자막 언어는 영상 음성과 동일합니다. 한국어 코치 영상은 KO URL + worker WHISPER_LANGUAGE=ko 권장.",
    },
    mock: {
      label: canRunYoutubeIngestionOnProd() ? "운영 Ingestion (mock-whisper)" : "Mock Whisper",
      className: "border-amber-200 bg-amber-50 text-amber-900",
      hint: canRunYoutubeIngestionOnProd()
        ? "9D: web.app → startYoutubeIngestion → Cloud Run MOCK. Segment 3줄 정상. 실제 Whisper는 worker MOCK 해제 후."
        : "Callable이 mock-whisper를 반환했습니다. 로컬 worker에서 YAGO_WORKER_MOCK=1을 해제하고 재시작하세요.",
    },
    incomplete: {
      label: "Ingestion 미완료",
      className: "border-orange-200 bg-orange-50 text-orange-900",
      hint: "Callable 응답 전 중단되었거나 emulator/worker 미연결일 수 있습니다. F12 Console [AI-INGEST] failed 로그를 확인하세요.",
    },
    failed: {
      label: "Ingestion 실패",
      className: "border-red-200 bg-red-50 text-red-900",
      hint: "아래 빨간 오류 메시지와 F12 Network → startYoutubeIngestion Response를 확인하세요.",
    },
    manual: {
      label: isProductionWebHost() ? "운영 데모 (수동·샘플)" : "수동 입력",
      className: isProductionWebHost()
        ? "border-blue-200 bg-blue-50 text-blue-900"
        : "border-gray-200 bg-gray-50 text-gray-700",
      hint: isProductionWebHost()
        ? "운영(web.app)에서는 로컬 Whisper가 없습니다. 샘플/직접 자막으로 Step3~5·PDF 데모는 정상입니다."
        : "자막을 직접 입력한 상태입니다. Whisper 자동 주입이 아닙니다.",
    },
  };
  const verdict = verdictMeta[ingestionVerdict];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900">STEP 2 — 자막 / 코치 말 입력</h3>
      <p className="text-sm text-gray-700">
        이 영역은 transcript ingestion 결과 표시 영역입니다. 현재는 validation 단계라 수동 입력도 지원합니다.
      </p>

      <div id="academy-mp4-upload-anchor">
        <AcademyMp4UploadPanel
          teamId={teamId}
          playerId={growthPlayerId}
          matchId={initialMatchId}
          initialMediaId={ingestionJobId}
          disabled={isProcessing}
          onIngestComplete={onAcademyMp4IngestComplete}
        />
      </div>

      <p className="text-center text-xs font-medium text-gray-400">또는 YouTube / 수동 입력</p>

      {ingestionUrlWarning ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {ingestionUrlWarning}
        </p>
      ) : null}
      <div className={cn("rounded-lg border px-3 py-2 text-xs", verdict.className)}>
        <p className="font-semibold">Pipeline: {verdict.label}</p>
        <p className="mt-1 opacity-90">{verdict.hint}</p>
        <p className="mt-1 opacity-80">
          환경: <strong>{ingestionRuntimeLabel()}</strong>
          {whisperPipelineMode() === "prod_demo_manual" ? (
            <span className="block mt-1 text-[11px]">
              PC 로컬에서 Whisper 73 segments = emulator + worker(8787). 운영과는 별개입니다.
            </span>
          ) : whisperPipelineMode() === "prod_cloud" ? (
            <span className="block mt-1 text-[11px]">
              「URL 기반 transcript 가져오기」→ prod Callable → Cloud Run (현재 mock 3 segments).
            </span>
          ) : null}
        </p>
      </div>
      {ingestionNotice ? (
        <div
          ref={ingestionNoticeRef}
          className="space-y-2 rounded-lg border-2 border-blue-300 bg-blue-50 px-3 py-3 text-xs text-blue-950"
          role="alert"
        >
          <p className="font-semibold">URL 가져오기 — 운영에서는 자막이 채워지지 않습니다</p>
          <p className="opacity-95">{ingestionNotice}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                document
                  .getElementById("academy-mp4-upload-anchor")
                  ?.scrollIntoView({ block: "start", behavior: "smooth" })
              }
            >
              MP4 업로드로 계속하기
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onFillSampleTranscript();
              }}
            >
              샘플 자막으로 채우기
            </Button>
            {!canRunYoutubeIngestion() ? (
              <Button type="button" size="sm" variant="outline" onClick={onDemoTagging}>
                데모 Step3 바로 가기
              </Button>
            ) : null}
          </div>
        </div>
      ) : !canRunYoutubeIngestion() ? (
        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <p className="font-medium">
            운영·모바일: 「URL 기반 transcript 가져오기」는 Whisper 미연결로 자막이 비어 있습니다. 「샘플 코치 말
            넣기」 또는 가져오기 클릭 후 「샘플 자막으로 채우기」를 사용하세요.
          </p>
        </div>
      ) : canRunYoutubeIngestionOnProd() ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <p className="font-medium">
            운영 Ingestion 활성 (9D): URL 가져오기 시 prod Callable이 Cloud Run worker를 호출합니다. 현재 worker는
            MOCK — mock-whisper 3 segments.
          </p>
        </div>
      ) : null}
      <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs text-violet-900">
        <p>
          Source:{" "}
          <strong>
            {ingestionSource === "youtube_url"
              ? "YOUTUBE_URL (BETA)"
              : ingestionSource === "demo_coach_sample"
                ? "DEMO COACH SAMPLE"
              : ingestionSource === "academy_mp4"
                ? "ACADEMY_MP4"
                : inputMode === "ingested"
                  ? "AUTO INGESTION"
                  : "MANUAL"}
          </strong>{" "}
          · 상태:{" "}
          <strong>{statusDetail}</strong>
        </p>
        <p className="mt-1 break-all text-violet-800/90">YouTube URL: {youtubeUrl || "미입력"}</p>
        {ingestionJobId ? <p className="mt-1 text-violet-800/90">Job ID: {ingestionJobId}</p> : null}
        <p className="mt-1 text-violet-800/90">
          Provider: <strong>{ingestionProvider ?? "— (미연동)"}</strong>
        </p>
        <p className="mt-1 text-violet-800/90">
          Transcript Language: <strong>{ingestionTranscriptLanguage ?? "—"}</strong>
          {ingestionTranscriptLanguage === "en" ? (
            <span className="text-violet-700/90"> (영상 음성이 영어 — 정상)</span>
          ) : ingestionTranscriptLanguage === "ko" ? (
            <span className="text-violet-700/90"> (한국어 전사 — 아카데미 태깅에 적합)</span>
          ) : null}
        </p>
        <p className="mt-1 text-violet-800/90">
          Segment Count: <strong>{ingestionSegmentCount ?? "—"}</strong>
        </p>
        <p className="mt-1 text-violet-800/90">
          Elapsed Time:{" "}
          <strong>
            {ingestionElapsedMs != null && ingestionElapsedMs > 0
              ? `${(ingestionElapsedMs / 1000).toFixed(1)}s`
              : "—"}
          </strong>
        </p>
        {ingestionAudioPath ? (
          <p className="mt-1 break-all text-violet-800/90">Audio Path: {ingestionAudioPath}</p>
        ) : null}
        {ingestionDuration != null && ingestionDuration > 0 ? (
          <p className="mt-1 text-violet-800/90">Duration: {ingestionDuration}s</p>
        ) : null}
        {runtimeProbeStatus ? (
          <p className="mt-1 text-violet-800/90">Status: {runtimeProbeStatus}</p>
        ) : null}
      </div>
      <textarea
        rows={10}
        value={subtitleText}
        onChange={(e) => onChangeSubtitle(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-3 font-mono text-xs"
        placeholder={
          canRunYoutubeIngestion()
            ? "「URL 기반 transcript 가져오기」 실행 후 Whisper segments가 여러 줄로 표시됩니다."
            : "코치 말을 한 줄씩 입력하세요. 예:\n좋아, 주변 보고 패스해봐\n압박 잘 버텼다, 바로 연결!\n실수해도 바로 따라가, 리커버리!"
        }
      />
      {transcriptSegments.length > 0 && inputMode === "manual" ? (
        <p className="text-xs text-emerald-700">
          수동 자막 {transcriptSegments.length}줄 인식됨 — 「AI 태깅 실행」을 눌러 주세요.
        </p>
      ) : null}
      {transcriptSegments.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs font-semibold text-gray-700">Transcript Segments ({transcriptSegments.length})</p>
          <ul className="mt-1 space-y-1 text-xs text-gray-600">
            {transcriptSegments.slice(0, 8).map((segment) => (
              <li
                key={segment.id}
                ref={(el) => {
                  segmentRefs.current[segment.id] = el;
                }}
                className={cn(
                  "rounded px-1 py-0.5",
                  activeTranscriptSegmentId === segment.id && "bg-violet-100 text-violet-900"
                )}
              >
                <button
                  type="button"
                  className="text-left underline-offset-2 hover:underline"
                  onClick={() => onSeekFromTranscript(segment.start)}
                >
                  [{formatSeconds(segment.start)}-{formatSeconds(segment.end)}] {segment.text}
                </button>
              </li>
            ))}
          </ul>
          {pendingSeekSeconds !== null ? (
            <p className="mt-2 text-[11px] text-violet-700">
              Seek 준비 상태: {formatSeconds(pendingSeekSeconds)} 클릭됨 (다음 단계에서 플레이어 seek 연동)
            </p>
          ) : null}
        </div>
      ) : null}
      {ingestionStatus === "failed" || ingestionError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-900">
          <p className="font-semibold">{YOUTUBE_URL_INGEST_FAIL_PARENT_MSG}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() =>
              document
                .getElementById("academy-mp4-upload-anchor")
                ?.scrollIntoView({ block: "start", behavior: "smooth" })
            }
          >
            MP4 업로드로 계속하기
          </Button>
          {ingestionError ? (
            <details className="mt-3 text-xs text-red-800">
              <summary className="cursor-pointer font-medium">기술 상세 (개발·검증용)</summary>
              {ingestionFailurePhase ? (
                <p className="mt-2 font-semibold">
                  실패 단계:{" "}
                  {ingestionFailurePhase === "extract"
                    ? "오디오 추출 (yt-dlp/ffmpeg)"
                    : ingestionFailurePhase === "transcribe"
                      ? "Whisper 전사"
                      : "처리 시간 초과"}
                </p>
              ) : null}
              <p className="mt-1 whitespace-pre-wrap">{ingestionError}</p>
            </details>
          ) : null}
        </div>
      ) : null}
      {ingestionProvider?.startsWith("mock-") && ingestionProvider !== "mock-worker" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          현재 mock ingestion provider로 동작 중입니다. 실제 자동 추출 연결을 위해 Functions 환경변수
          <code className="ml-1 rounded bg-amber-100 px-1">YAGO_INGEST_PIPELINE_BASE_URL</code>
          설정과 worker 서버 연결이 필요합니다.
        </p>
      ) : null}
      {taggingError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {taggingError}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onFillSampleTranscript} disabled={isProcessing}>
          샘플 코치 말 넣기
        </Button>
        {!canRunYoutubeIngestion() ? (
          <Button type="button" variant="outline" size="sm" onClick={onDemoTagging} disabled={isProcessing}>
            데모 Step3 바로 가기
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={() => void onRunIngestion()}
          disabled={isProcessing}
          title={
            canRunYoutubeIngestion()
              ? undefined
              : "Whisper 파이프라인 미연결 — 클릭 시 안내"
          }
        >
          {isProcessing ? "자동 추출 처리 중..." : "URL 기반 transcript 가져오기"}
        </Button>
        <Button
          type="button"
          onClick={onRunTagging}
          disabled={isProcessing || taggingStatus === "running" || (!transcriptSegments.length && !subtitleText.trim())}
        >
          {taggingStatus === "running" ? "GPT 태깅 중..." : "AI 태깅 실행 →"}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          ← 이전
        </Button>
      </div>
    </div>
  );
}

function Step3Panel({
  events,
  taggingProvider,
  activeEventId,
  selectedEventId,
  onFocusEvent,
  onLoadDemoSamples,
  onBack,
  onNext,
}: {
  events: MockGrowthEvent[];
  taggingProvider: string | null;
  activeEventId: string | null;
  selectedEventId: string | null;
  onFocusEvent: (eventId: string, seconds: number) => void;
  onLoadDemoSamples: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900">STEP 3 — AI 태깅 결과</h3>
      {isGevV1_15Enabled() ? (
        <p className="text-xs text-violet-700">GEV v1 — 15종 이벤트 체계 (Transcript Rule + GPT)</p>
      ) : null}
      {taggingProvider ? (
        <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
          Provider: <strong>{taggingProvider}</strong>
          {taggingProvider === "gpt" ? " — transcript 기반 GPT 제안 (코치 검토 필수)" : null}
        </p>
      ) : null}
      {events.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <p className="font-semibold">코치 발화 기반 성장 이벤트를 찾지 못했습니다.</p>
          <p className="mt-2 text-xs">
            테스트 영상이 축구 코칭이 아니면 0건이 정상입니다. 한국어 코칭 클립으로 Step1 URL을 바꾼 뒤 다시
            ingestion → 태깅을 실행하세요.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onLoadDemoSamples}>
            데모 샘플 태그로 Step4 체험
          </Button>
        </div>
      ) : null}
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              "rounded-xl border bg-white px-3 py-3",
              selectedEventId === event.id
                ? "border-violet-500 bg-violet-50"
                : activeEventId === event.id
                  ? "border-violet-300 bg-violet-50/70"
                  : "border-gray-200"
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                className="font-medium text-gray-700 underline-offset-2 hover:underline"
                onClick={() => onFocusEvent(event.id, event.transcriptStart)}
              >
                {formatSeconds(event.transcriptStart)}-{formatSeconds(event.transcriptEnd)}
              </button>
              <code className="rounded bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-800">
                {growthEventDisplayCode(event)}
              </code>
              {event.gevV1Key ? (
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-900">
                  {growthEventDisplayLabel(event)}
                </span>
              ) : null}
              <ConfidenceBadge level={event.confidence} />
              {event.confidence !== "HIGH" ? (
                <span className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-700">
                  애매 가능
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-gray-800">원문: {event.evidence}</p>
            <p className="mt-1 text-sm text-gray-700">{event.guardianPhrase}</p>
            <p className="mt-1 text-xs text-gray-500">{EVENT_HELPER_TEXT[event.eventType] ?? "해석 필요"}</p>
            <div className="mt-2">
              <Button
                type="button"
                size="sm"
                variant={selectedEventId === event.id ? "default" : "outline"}
                onClick={() => onFocusEvent(event.id, event.transcriptStart)}
              >
                {selectedEventId === event.id ? "선택됨" : "검토 대상으로 선택"}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600">AI 신뢰도 ≠ 진실. MEDIUM/LOW 항목은 코치가 반드시 검토하세요.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← 이전
        </Button>
        <Button type="button" onClick={onNext}>
          다음 — 코치 검토 →
        </Button>
      </div>
    </div>
  );
}

function YouTubeSyncPlayer({
  videoId,
  seekRequest,
  currentPlaybackSeconds,
  onTimeUpdate,
  playerUiState,
  onPlayerStateChange,
  events,
  timelineDurationHint,
  title,
}: {
  videoId: string;
  seekRequest: { seconds: number; token: number } | null;
  currentPlaybackSeconds: number;
  onTimeUpdate: (seconds: number) => void;
  playerUiState: PlayerUiState;
  onPlayerStateChange: (state: PlayerUiState) => void;
  events: MockGrowthEvent[];
  timelineDurationHint: number;
  title: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YoutubePlayerHandle | null>(null);
  const playerReadyRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);

  const applySeek = (seconds: number) => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current || typeof player.seekTo !== "function") {
      pendingSeekRef.current = seconds;
      return;
    }
    try {
      player.seekTo(Math.max(0, seconds), true);
      pendingSeekRef.current = null;
    } catch (error) {
      console.warn("[YouTubeSyncPlayer] seekTo failed", error);
    }
  };

  useEffect(() => {
    const existing = document.getElementById("yago-youtube-iframe-api");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "yago-youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }

    playerReadyRef.current = false;
    pendingSeekRef.current = null;

    const initPlayer = () => {
      if (!hostRef.current || !window.YT?.Player) return;
      const previous = playerRef.current;
      if (previous && typeof previous.destroy === "function") {
        try {
          previous.destroy();
        } catch {
          /* ignore teardown */
        }
      }
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            const pending = pendingSeekRef.current;
            if (pending == null) return;
            const player = playerRef.current;
            if (player && typeof player.seekTo === "function") {
              try {
                player.seekTo(Math.max(0, pending), true);
                pendingSeekRef.current = null;
              } catch (error) {
                console.warn("[YouTubeSyncPlayer] onReady seekTo failed", error);
              }
            }
          },
          onStateChange: (evt: { data: number }) => {
            const state = mapYoutubeState(evt.data);
            onPlayerStateChange(state);
          },
        },
      }) as YoutubePlayerHandle;
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };
    }

    return () => {
      playerReadyRef.current = false;
      pendingSeekRef.current = null;
      const player = playerRef.current;
      if (player && typeof player.destroy === "function") {
        try {
          player.destroy();
        } catch {
          /* ignore teardown */
        }
      }
      playerRef.current = null;
    };
  }, [videoId, onPlayerStateChange]);

  useEffect(() => {
    if (!seekRequest) return;
    applySeek(seekRequest.seconds);
  }, [seekRequest]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime?.();
      if (typeof t === "number" && Number.isFinite(t)) {
        onTimeUpdate(t);
      }
    }, 400);

    return () => window.clearInterval(timer);
  }, [onTimeUpdate]);

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
      <p className="mb-2 text-sm font-semibold text-violet-900">{title}</p>
      <div className="aspect-video overflow-hidden rounded-lg border border-violet-100 bg-black">
        <div ref={hostRef} className="h-full w-full" title="YAGO YouTube Sync Player" />
      </div>
      <div className="mt-2 rounded-md border border-violet-100 bg-white px-2 py-2">
        <p className="text-[11px] font-semibold text-violet-800">
          상태: {playerUiState.toUpperCase()} · 현재 재생: {formatSeconds(currentPlaybackSeconds)} · Timeline Overlay
        </p>
        <div className="relative mt-2 h-3 rounded bg-violet-100">
          {events.map((event) => {
            const left = Math.max(0, Math.min(100, (event.transcriptStart / timelineDurationHint) * 100));
            const width = Math.max(
              1,
              Math.min(100 - left, ((event.transcriptEnd - event.transcriptStart) / timelineDurationHint) * 100)
            );
            return (
              <span
                key={event.id}
                className="absolute top-0 h-3 rounded bg-violet-500/70"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${event.eventType} ${formatSeconds(event.transcriptStart)}-${formatSeconds(event.transcriptEnd)}`}
              />
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-violet-700">
        transcript/event 타임스탬프 클릭 시 `player.seekTo(seconds)`로 즉시 이동합니다.
      </p>
    </div>
  );
}

function Step4Panel({
  events,
  selectedEventId,
  currentPlaybackSeconds,
  transcriptSegments,
  reviewContexts,
  autoSeekSelectedEvent,
  confusionNote,
  onFocusEvent,
  onApplyReview,
  onToggleAutoSeek,
  onChangeConfusionNote,
  onBack,
  verifiedCount,
  onNext,
}: {
  events: MockGrowthEvent[];
  selectedEventId: string | null;
  currentPlaybackSeconds: number;
  transcriptSegments: TranscriptSegment[];
  reviewContexts: Record<string, CoachReviewContext>;
  autoSeekSelectedEvent: boolean;
  confusionNote: string;
  onFocusEvent: (eventId: string, seconds: number) => void;
  onApplyReview: (eventId: string, action: CoachReviewAction, coachNote?: string) => void;
  onToggleAutoSeek: (enabled: boolean) => void;
  onChangeConfusionNote: (v: string) => void;
  onBack: () => void;
  verifiedCount: number;
  onNext: () => void;
}) {
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const selectedContext = selectedEventId ? reviewContexts[selectedEventId] : undefined;
  const [editNote, setEditNote] = useState("");

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900">STEP 4 — 코치 검토 · 승인</h3>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        AI 제안 검토 — 승인 없이 학부모 리포트 생성 불가
        {verifiedCount > 0 ? (
          <span className="mt-1 block font-semibold text-emerald-800">
            리포트 반영 준비: {verifiedCount}건 승인됨 (Step5에서 확인)
          </span>
        ) : null}
      </div>
      <label className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
        <input
          type="checkbox"
          checked={autoSeekSelectedEvent}
          onChange={(e) => onToggleAutoSeek(e.target.checked)}
        />
        선택 이벤트 기준 자동 seek
      </label>
      {selectedEvent ? (
        <div className="rounded-xl border border-violet-300 bg-violet-50/70 px-3 py-3">
          <p className="text-sm font-semibold text-violet-900">선택된 이벤트 상세 (영상 검증 컨텍스트)</p>
          <div className="mt-2 space-y-1 text-xs text-violet-900">
            <p>type: {selectedEvent.eventType}</p>
            <p>
              timestamp: {formatSeconds(selectedEvent.transcriptStart)}-{formatSeconds(selectedEvent.transcriptEnd)}
            </p>
            <p>evidence: {selectedEvent.evidence}</p>
            <p>transcript: {buildTranscriptSnippet(selectedEvent, transcriptSegments)}</p>
            <p>confidence: {selectedEvent.confidence}</p>
            <p>video timestamp: {formatSeconds(currentPlaybackSeconds)}</p>
          </div>
          {selectedContext ? (
            <p className="mt-2 text-[11px] text-violet-700">
              최근 저장: {selectedContext.action.toUpperCase()} @ {formatSeconds(selectedContext.videoTimestamp)}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => onApplyReview(selectedEvent.id, "confirmed")}>
              승인
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onApplyReview(selectedEvent.id, "rejected")}>
              반려
            </Button>
          </div>
          <div className="mt-2 space-y-2">
            <textarea
              rows={2}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-xs"
              placeholder="코치 수정 메모 (예: SCAN 해석을 더 보수적으로 수정)"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onApplyReview(selectedEvent.id, "edited", editNote)}
            >
              수정 저장
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Step3에서 검토할 이벤트를 먼저 선택해주세요.
        </p>
      )}
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              "rounded-xl border px-3 py-3",
              selectedEventId === event.id ? "border-violet-400 bg-violet-50/40" : "border-gray-200"
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => onFocusEvent(event.id, event.transcriptStart)}
              >
                {formatSeconds(event.transcriptStart)}-{formatSeconds(event.transcriptEnd)}
              </button>
              <code className="rounded bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-800">
                {event.eventType}
              </code>
              <ConfidenceBadge level={event.confidence} />
              {event.reviewStatus === "confirmed" ||
              reviewContexts[event.id]?.action === "confirmed" ||
              reviewContexts[event.id]?.action === "edited" ? (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                  승인됨
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-gray-800">원문: {event.evidence}</p>
            <p className="mt-1 text-sm text-gray-700">{event.guardianPhrase}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => onApplyReview(event.id, "confirmed")}>
                승인
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onApplyReview(event.id, "rejected")}>
                반려
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onApplyReview(event.id, "edited", "코치가 수동 검토로 일부 보정")}
              >
                수정
              </Button>
            </div>
          </div>
        ))}
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-gray-800">confusion 메모</span>
        <textarea
          rows={3}
          value={confusionNote}
          onChange={(e) => onChangeConfusionNote(e.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          placeholder="예: SCAN vs BODY_ORIENTATION 구간 2회 혼동"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← 이전
        </Button>
        <Button type="button" onClick={onNext}>
          승인 완료 → 학부모 리포트 생성
        </Button>
      </div>
    </div>
  );
}

function Step5Panel({
  embedded = false,
  teamId,
  teamName,
  playerName,
  growthPlayerId,
  videoId,
  mediaId,
  reviewContexts,
  verifiedItems,
  verification,
  selectedEventId,
  topEventTypes,
  confusionNote,
  readAloudNote,
  onSelectEvent,
  onSeekFromReport,
  onChangeReadAloudNote,
  onBack,
}: {
  embedded?: boolean;
  teamId: string;
  teamName?: string;
  playerName: string;
  growthPlayerId?: string;
  videoId: string | null;
  mediaId?: string | null;
  reviewContexts: Record<string, CoachReviewContext>;
  verifiedItems: VerifiedReportItem[];
  verification: ReturnType<typeof buildVerificationSummaryMerged>;
  selectedEventId: string | null;
  topEventTypes: [string, number][];
  confusionNote: string;
  readAloudNote: string;
  onSelectEvent: (eventId: string) => void;
  onSeekFromReport: (seconds: number) => void;
  onChangeReadAloudNote: (v: string) => void;
  onBack: () => void;
}) {
  const cvPilotMediaId = resolveCvPilotMediaId();
  const cvPanelMediaId = mediaId ?? cvPilotMediaId ?? null;

  useEffect(() => {
    if (!import.meta.env.DEV || !cvPanelMediaId) return;
    console.info("[ACADEMY-CV] Step5 CV panel mediaId", {
      ingestionJobId: mediaId ?? null,
      cvPilotMediaId: cvPilotMediaId ?? null,
      cvPanelMediaId,
    });
  }, [cvPanelMediaId, cvPilotMediaId, mediaId]);

  const [reportTone, setReportTone] = useState<ReportTone>("reassurance");
  const [trendWindow, setTrendWindow] = useState<GrowthTrendWindow>("7d");
  const [historySessions, setHistorySessions] = useState<PlayerGrowthSessionDoc[]>([]);
  const [historySource, setHistorySource] = useState<"firestore" | "local" | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySavedNotice, setHistorySavedNotice] = useState<string | null>(null);
  const [historySavePending, setHistorySavePending] = useState(false);
  const [lastDelivery, setLastDelivery] = useState<GrowthReportDeliveryResult | null>(null);
  const [lastDeliverySessionId, setLastDeliverySessionId] = useState<string | null>(null);
  const [deliveryPending, setDeliveryPending] = useState(false);
  const [pdfExportPending, setPdfExportPending] = useState(false);
  const [pdfExportNotice, setPdfExportNotice] = useState<string | null>(null);
  const [monthlyPdfExportPending, setMonthlyPdfExportPending] = useState(false);
  const [monthlyPdfExportNotice, setMonthlyPdfExportNotice] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<SeasonWindow>(() => inferDefaultSeason());
  const [seasonPdfExportPending, setSeasonPdfExportPending] = useState(false);
  const [seasonPdfExportNotice, setSeasonPdfExportNotice] = useState<string | null>(null);
  const [ovrProfile, setOvrProfile] = useState<PlayerGrowthOvrDoc | null>(null);
  const [ovrLoading, setOvrLoading] = useState(false);
  const [ovrActionPending, setOvrActionPending] = useState(false);
  const [ovrNotice, setOvrNotice] = useState<string | null>(null);
  const [avatarProfile, setAvatarProfile] = useState<PlayerGrowthAvatarDoc | null>(null);
  const [step5GrowthTimeline, setStep5GrowthTimeline] =
    useState<Awaited<ReturnType<typeof getPlayerGrowthTimeline>> | null>(null);
  const [levelUpCelebration, setLevelUpCelebration] = useState<GrowthLevelUpEvent | null>(null);
  const [badgeUnlockCelebration, setBadgeUnlockCelebration] =
    useState<GrowthBadgeUnlockEvent | null>(null);

  const reportMetadata = useMemo(
    () =>
      buildReportMetadata({
        teamId,
        playerName,
        tone: reportTone,
        videoId,
        reviewedEventCount: verification.verifiedForReportCount,
      }),
    [teamId, playerName, reportTone, videoId, verification.verifiedForReportCount]
  );
  const evidenceItems = useMemo(
    () => buildEvidenceItems(verifiedItems, playerName),
    [verifiedItems, playerName]
  );
  const narrative = useMemo(
    () =>
      generateGuardianNarrative({
        playerName,
        tone: reportTone,
        verifiedItems,
      }),
    [playerName, reportTone, verifiedItems]
  );
  const trendDashboard = useMemo(
    () => computeGrowthTrendDashboard(historySessions, trendWindow),
    [historySessions, trendWindow]
  );
  const growthScore = useMemo(
    () => (verifiedItems.length > 0 ? computeGrowthScore(verifiedItems) : null),
    [verifiedItems]
  );
  const growthScoreDelta = useMemo(() => {
    if (!growthScore?.snapshot.overall) return null;
    const baseline = buildComparisonBaselineFromSessions(historySessions, videoId);
    const delta = compareGrowthScoreToHistory(growthScore.snapshot.overall, baseline);
    if (import.meta.env.DEV) {
      console.info("[playerGrowthHistory] comparison baseline", {
        ...debugGrowthComparisonBaseline(historySessions, videoId),
        currentOverall: growthScore.snapshot.overall,
        delta,
      });
    }
    return delta;
  }, [growthScore, historySessions, videoId]);

  const monthlyTimeline = useMemo(
    () => buildMonthlyGrowthTimeline(historySessions),
    [historySessions]
  );

  const coachAiSummary = useMemo(() => {
    if (!avatarProfile) return null;
    return buildGrowthAiSummaryFromAvatar({
      playerName,
      avatar: avatarProfile,
      timeline: step5GrowthTimeline,
    });
  }, [avatarProfile, playerName, step5GrowthTimeline]);

  const canExportTimelinePdf = useMemo(
    () =>
      historySessions.filter((s) => (s.metrics.growthScore?.overall ?? 0) > 0).length >= 2,
    [historySessions]
  );

  const monthlyGrowthReport = useMemo(
    () =>
      buildMonthlyGrowthReport({
        sessions: historySessions,
        playerName,
        teamName,
        coachNotes: [confusionNote, readAloudNote].filter((n) => n.trim().length > 0),
      }),
    [historySessions, playerName, teamName, confusionNote, readAloudNote]
  );

  const availableSeasons = useMemo(
    () => listSeasonsWithSessions(historySessions),
    [historySessions]
  );

  const seasonGrowthReport = useMemo(
    () =>
      buildSeasonGrowthReport({
        sessions: historySessions,
        playerName,
        teamName,
        season: selectedSeason,
        coachNotes: [confusionNote, readAloudNote].filter((n) => n.trim().length > 0),
        currentOvrProfile: ovrProfile,
      }),
    [historySessions, playerName, teamName, selectedSeason, confusionNote, readAloudNote, ovrProfile]
  );

  const seasonRankedDeltas = useMemo(() => {
    const seasonSessions = filterSessionsForSeason(historySessions, selectedSeason);
    return rankDimensionDeltas(lastSessionPerMonth(seasonSessions));
  }, [historySessions, selectedSeason]);

  const activeGrowthShare = useMemo(() => {
    if (lastDelivery && lastDeliverySessionId) {
      return {
        shareUrl: lastDelivery.shareUrl,
        delivery: lastDelivery.delivery,
        sessionDocId: lastDeliverySessionId,
      };
    }
    const withDelivery = historySessions.find((s) => s.delivery?.pdfStoragePath);
    if (!withDelivery?.delivery) return null;
    return {
      shareUrl: shareUrlFromSessionDelivery(withDelivery.delivery) ?? null,
      delivery: withDelivery.delivery,
      sessionDocId: withDelivery.sessionId,
    };
  }, [lastDelivery, lastDeliverySessionId, historySessions]);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setOvrLoading(true);
    void Promise.all([
      loadGrowthHistoryCanonical(teamId, playerName, { playerId: growthPlayerId }),
      loadPlayerGrowthOvr(teamId, playerName, growthPlayerId),
      loadPlayerGrowthAvatar(teamId, playerName, growthPlayerId),
      getPlayerGrowthTimeline(teamId, growthPlayerId, 5).catch(() => null),
    ])
      .then(([history, ovr, avatar, timeline]) => {
        if (cancelled) return;
        setHistorySessions(history.sessions);
        setHistorySource(history.source);
        setOvrProfile(ovr);
        setAvatarProfile(avatar);
        setStep5GrowthTimeline(timeline);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("[playerGrowthHistory] Step5 load failed", error);
        setHistorySessions([]);
        setHistorySource("local");
        setOvrProfile(null);
        setAvatarProfile(null);
        setStep5GrowthTimeline(null);
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
          setOvrLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, playerName, growthPlayerId]);

  useEffect(() => {
    document.getElementById("step5-parent-growth-summary")?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, []);

  async function handleSyncOvrFromSession() {
    if (!growthScore?.snapshot) {
      setOvrNotice("현재 세션 Growth Score가 없습니다. Step4에서 이벤트를 승인해 주세요.");
      return;
    }
    setOvrActionPending(true);
    setOvrNotice(null);
    setLevelUpCelebration(null);
    setBadgeUnlockCelebration(null);
    try {
      const result = await syncPlayerOvrFromGrowthSnapshot({
        teamId,
        playerName,
        playerId: growthPlayerId,
        snapshot: growthScore.snapshot,
      });
      setOvrProfile(result.ovrDoc);
      setAvatarProfile(result.avatarDoc);
      setLevelUpCelebration(result.levelUpEvent);
      setBadgeUnlockCelebration(result.badgeUnlockEvent);
      setOvrNotice(
        `${result.avatarMirror.message} · OVR ${result.ovrDoc.ovr} (Vision ${result.ovrDoc.vision} · Pressure ${result.ovrDoc.pressure} · Recovery ${result.ovrDoc.recovery})`
      );
    } catch (error) {
      setOvrNotice(error instanceof Error ? error.message : "OVR 동기화 실패");
    } finally {
      setOvrActionPending(false);
    }
  }

  async function handleApplySeasonOvr() {
    if (!seasonRankedDeltas.length) {
      setOvrNotice("시즌 OVR 반영에 필요한 월간 성장 데이터가 없습니다.");
      return;
    }
    setOvrActionPending(true);
    setOvrNotice(null);
    setLevelUpCelebration(null);
    setBadgeUnlockCelebration(null);
    try {
      const result = await applySeasonOvrFromDeltas({
        teamId,
        playerName,
        playerId: growthPlayerId,
        seasonId: selectedSeason.id,
        rankedDeltas: seasonRankedDeltas,
        currentProfile: ovrProfile,
      });
      setOvrProfile(result.ovrDoc);
      setAvatarProfile(result.avatarDoc);
      setLevelUpCelebration(result.levelUpEvent);
      setBadgeUnlockCelebration(result.badgeUnlockEvent);
      setOvrNotice(
        `${result.avatarMirror.message} · ${selectedSeason.label} · OVR ${result.ovrDoc.ovr} (Vision ${result.ovrDoc.vision} / Pressure ${result.ovrDoc.pressure} / Recovery ${result.ovrDoc.recovery})`
      );
    } catch (error) {
      setOvrNotice(error instanceof Error ? error.message : "시즌 OVR 반영 실패");
    } finally {
      setOvrActionPending(false);
    }
  }

  async function handleExportSeasonPdf() {
    setSeasonPdfExportPending(true);
    setSeasonPdfExportNotice(null);
    try {
      const resolvedPlayerId = resolveGrowthPlayerIdForSession({
        playerId: growthPlayerId,
        displayName: playerName,
      });
      let recentSessionTimeline = null;
      try {
        recentSessionTimeline = await getPlayerGrowthTimeline(teamId, resolvedPlayerId, 5);
      } catch (timelineError) {
        console.warn("[Step5] season PDF timeline load failed", timelineError);
      }
      const filename = await exportSeasonGrowthReportPdf({
        ...seasonGrowthReport,
        recentSessionTimeline,
        weeklyGrowthDigest: buildWeeklyGrowthDigestForPdfExport({
          avatar: avatarProfile,
          timeline: recentSessionTimeline,
        }),
        aiGrowthSummary: coachAiSummary,
      });
      setSeasonPdfExportNotice(`시즌 PDF 다운로드 완료: ${filename}`);
    } catch (error) {
      setSeasonPdfExportNotice(error instanceof Error ? error.message : "시즌 PDF 생성 실패");
    } finally {
      setSeasonPdfExportPending(false);
    }
  }

  async function handleExportMonthlyPdf() {
    setMonthlyPdfExportPending(true);
    setMonthlyPdfExportNotice(null);
    try {
      const resolvedPlayerId = resolveGrowthPlayerIdForSession({
        playerId: growthPlayerId,
        displayName: playerName,
      });
      let recentSessionTimeline = null;
      try {
        recentSessionTimeline = await getPlayerGrowthTimeline(teamId, resolvedPlayerId, 5);
      } catch (timelineError) {
        console.warn("[Step5] monthly PDF timeline load failed", timelineError);
      }
      const filename = await exportMonthlyGrowthReportPdf({
        ...monthlyGrowthReport,
        recentSessionTimeline,
        weeklyGrowthDigest: buildWeeklyGrowthDigestForPdfExport({
          avatar: avatarProfile,
          timeline: recentSessionTimeline,
        }),
        aiGrowthSummary: coachAiSummary,
      });
      setMonthlyPdfExportNotice(`월간 PDF 다운로드 완료: ${filename}`);
    } catch (error) {
      setMonthlyPdfExportNotice(error instanceof Error ? error.message : "월간 PDF 생성 실패");
    } finally {
      setMonthlyPdfExportPending(false);
    }
  }

  async function handleExportPdf() {
    setPdfExportPending(true);
    setPdfExportNotice(null);
    try {
      let recentSessionTimeline = null;
      try {
        const resolvedPlayerId = resolveGrowthPlayerIdForSession({
          playerId: growthPlayerId,
          displayName: playerName,
        });
        recentSessionTimeline = await getPlayerGrowthTimeline(teamId, resolvedPlayerId, 5);
      } catch (timelineError) {
        console.warn("[Step5] session PDF timeline load failed", timelineError);
      }
      const filename = await exportGrowthReportPdf({
        playerName,
        teamName,
        metadata: reportMetadata,
        growthScore,
        growthScoreDelta,
        historySessions,
        monthlyTimeline: monthlyTimeline.hasEnoughData ? monthlyTimeline : null,
        narrative,
        evidenceItems,
        reportTone,
        confusionNote,
        readAloudNote,
        weeklyGrowthDigest: buildWeeklyGrowthDigestForPdfExport({
          avatar: avatarProfile,
          timeline: recentSessionTimeline,
        }),
        aiGrowthSummary: coachAiSummary,
      });
      void callRecordPrivacyAuditEvent({
        teamId,
        eventType: "PDF_GENERATED",
        ...(mediaId ? { mediaId } : {}),
        detail: { filename, playerName, verifiedEventCount: verification.verifiedForReportCount },
      });
      setPdfExportNotice(`PDF 다운로드 완료: ${filename}`);
    } catch (error) {
      setPdfExportNotice(error instanceof Error ? error.message : "PDF 생성 실패");
    } finally {
      setPdfExportPending(false);
    }
  }

  async function saveSessionToGrowthHistory() {
    if (verifiedItems.length === 0) {
      setHistorySavedNotice("저장할 코치 검증 이벤트가 없습니다.");
      return;
    }
    setHistorySavePending(true);
    setDeliveryPending(false);
    setHistorySavedNotice(null);
    setLastDelivery(null);
    setLastDeliverySessionId(null);
    setLevelUpCelebration(null);
    setBadgeUnlockCelebration(null);
    try {
      const growthPlayerKey = resolveGrowthPlayerIdForSession({
        playerId: growthPlayerId,
        displayName: playerName,
      });
      const avatarSnapshotBeforeSave = await loadPlayerGrowthAvatarByPlayerId(teamId, growthPlayerKey);
      console.info("[D-4.1] avatar snapshot before Step5 persist", {
        teamId,
        playerId: growthPlayerKey,
        level: avatarSnapshotBeforeSave?.level ?? null,
        ovr: avatarSnapshotBeforeSave?.ovr ?? null,
      });

      const result = await persistPlayerGrowthSession({
        teamId,
        playerName,
        playerId: growthPlayerId,
        videoId,
        tone: reportTone,
        verifiedItems,
        reviewContexts,
      });
      void callRecordPrivacyAuditEvent({
        teamId,
        eventType: "COACH_APPROVED",
        ...(mediaId ? { mediaId } : {}),
        detail: {
          verifiedEventCount: verifiedItems.length,
          sessionId: result.sessionId,
          playerName,
        },
      });
      const loaded = await loadGrowthHistoryCanonical(teamId, playerName, { playerId: growthPlayerId });
      setHistorySessions(loaded.sessions);
      setHistorySource(loaded.source);
      const sourceLabel = result.source === "firestore" ? "Firestore (canonical)" : "local fallback";
      let notice = `저장 완료 · ${sourceLabel} · session ${result.sessionId}`;

      if (result.source === "firestore") {
        const scoreForDelivery = growthScore ?? computeGrowthScore(verifiedItems);
        notice += `\n저장 전 Avatar 스냅샷 Level ${avatarSnapshotBeforeSave?.level ?? "(없음)"}`;
        console.info("[growthReportDelivery] session saved — starting delivery pipeline", {
          teamId,
          sessionId: result.sessionId,
          playerName,
        });
        setDeliveryPending(true);
        try {
          const delivered = await deliverGrowthReportForSession(
            teamId,
            result.sessionId,
            {
              playerName,
              teamName,
              metadata: reportMetadata,
              growthScore: scoreForDelivery,
              growthScoreDelta,
              historySessions: loaded.sessions,
              monthlyTimeline: monthlyTimeline.hasEnoughData ? monthlyTimeline : null,
              narrative,
              evidenceItems,
              reportTone,
              confusionNote,
              readAloudNote,
            }
          );
          setLastDelivery(delivered);
          setLastDeliverySessionId(result.sessionId);
          const clipText = buildParentDeliveryShareMessage({
            playerName,
            shareUrl: delivered.shareUrl,
            growthScore: scoreForDelivery,
          }).clipText;
          try {
            const autoSend = await maybeAutoSendParentDelivery({
              teamId,
              playerId: growthPlayerId ?? "",
              sessionId: result.sessionId,
              shareUrl: delivered.shareUrl,
              clipText,
              displayName: playerName,
            });
            if (autoSend && !autoSend.skipped && autoSend.log.status === "sent") {
              const providerLabel =
                autoSend.log.provider === "kakao_alimtalk" ? "알림톡" : "Mock";
              notice += `\n학부모 자동 발송(${providerLabel}) 완료 · deliveryLogs 기록`;
            }
          } catch (autoErr) {
            console.warn("[ParentDelivery] auto send failed", autoErr);
            notice += "\n자동 발송(Mock) 실패 — 수동 전달을 사용하세요.";
          }
          void callRecordPrivacyAuditEvent({
            teamId,
            eventType: "PDF_GENERATED",
            ...(mediaId ? { mediaId } : {}),
            detail: {
              filename: delivered.filename,
              playerName,
              sessionId: result.sessionId,
              shareUrl: delivered.shareUrl,
              delivery: true,
            },
          });
          const reloaded = await loadGrowthHistoryCanonical(teamId, playerName, {
            playerId: growthPlayerId,
          });
          setHistorySessions(reloaded.sessions);
          setHistorySource(reloaded.source);
          notice +=
            "\n보호자 전달 준비 완료\nPDF Storage 업로드 완료\n아래 「학부모 전달」에서 카카오톡·복사로 전달하세요";
        } catch (deliveryError) {
          console.warn("[growthReportDelivery] upload failed", deliveryError);
          notice += `\nPDF 업로드 실패: ${
            deliveryError instanceof Error ? deliveryError.message : "알 수 없는 오류"
          }`;
        } finally {
          setDeliveryPending(false);
        }

        if (scoreForDelivery?.snapshot) {
          try {
            const latestLoaded = await loadGrowthHistoryCanonical(teamId, playerName, {
              playerId: growthPlayerId,
            });
            const sessions = latestLoaded.sessions.length > 0 ? latestLoaded.sessions : loaded.sessions;

            console.info("[D-4.1] syncPlayerGrowthAvatarAfterSession (post-delivery, last writer)", {
              teamId,
              playerId: growthPlayerId,
              sessionId: result.sessionId,
              snapshotLevel: avatarSnapshotBeforeSave?.level ?? null,
            });
            const avatarSync = await syncPlayerGrowthAvatarAfterSession({
              teamId,
              playerName,
              playerId: growthPlayerId,
              sessionId: result.sessionId,
              snapshot: scoreForDelivery.snapshot,
              sessions,
              snapshotBeforeSave: avatarSnapshotBeforeSave,
            });
            setOvrProfile(avatarSync.ovrDoc);
            setAvatarProfile(avatarSync.avatarDoc);
            if (avatarSync.levelUpEvent) {
              setLevelUpCelebration(avatarSync.levelUpEvent);
            }
            if (avatarSync.badgeUnlockEvent) {
              setBadgeUnlockCelebration(avatarSync.badgeUnlockEvent);
            }
            notice += `\nAvatar Level ${avatarSync.avatarDoc.level} · OVR ${avatarSync.avatarDoc.ovr}`;
            if (avatarSync.levelUpEvent) {
              notice += `\n🎉 레벨 업! Level ${avatarSync.levelUpEvent.previousLevel} → ${avatarSync.levelUpEvent.currentLevel}`;
            } else if (
              avatarSnapshotBeforeSave &&
              avatarSnapshotBeforeSave.level < avatarSync.avatarDoc.level
            ) {
              notice += `\n[D-4.1] 메타데이터 저장: lastLevel=${avatarSync.avatarDoc.lastLevel ?? "?"}`;
            }
            if (avatarSync.badgeUnlockEvent) {
              notice += `\n${formatBadgeUnlockNotice(avatarSync.badgeUnlockEvent)}`;
            }
          } catch (avatarError) {
            const code =
              avatarError && typeof avatarError === "object" && "code" in avatarError
                ? String((avatarError as { code?: unknown }).code ?? "")
                : "";
            console.error("[D-4.1] avatar sync after Step5 failed", { code, avatarError });
            notice += `\nAvatar 동기화 실패 (${code || "error"}): ${
              avatarError instanceof Error ? avatarError.message : "알 수 없는 오류"
            }`;
          }
        } else {
          console.warn("[D-4.1] avatar sync skipped — growthScore snapshot missing after Step5 save");
          notice += "\nAvatar 동기화 건너뜀: Growth Score 스냅샷 없음";
        }
      } else {
        console.warn("[growthReportDelivery] skipped: session saved to local fallback only");
        notice +=
          "\n보호자 전달 건너뜀: Firestore 저장 실패(로컬만 저장). 네트워크·권한 확인 후 다시 저장하세요.";
      }

      setHistorySavedNotice(notice);
    } catch (error) {
      setHistorySavedNotice(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setHistorySavePending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900">STEP 5 — 학부모 성장 리포트</h3>
      <VerificationBadgeBar summary={verification} />

      {cvPanelMediaId ? (
        <section
          className="space-y-2 rounded-xl border-2 border-cyan-300 bg-cyan-50/40 p-4"
          aria-label="CV Interpretation Pilot"
          data-testid="step5-cv-interpretation-pilot"
        >
          <div>
            <p className="text-sm font-bold text-cyan-950">CV Interpretation Pilot (J5 / J6 / I8)</p>
            <p className="mt-0.5 text-xs text-cyan-900">
              Signals · Growth Link Review · Interpretation Candidates · Coach Review — Growth Mapping
              미연결.
            </p>
            <p className="mt-1 font-mono text-[10px] text-cyan-800">mediaId: {cvPanelMediaId}</p>
          </div>
          <CvRunInternalPanel teamId={teamId} mediaId={cvPanelMediaId} />
        </section>
      ) : null}

      <section
        id="step5-parent-growth-summary"
        aria-label="학부모 성장 요약"
        className={cn(
          "space-y-3 sm:space-y-4",
          embedded
            ? "rounded-none border-0 bg-transparent p-0 shadow-none"
            : "rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50/90 to-white p-3 shadow-sm sm:p-4"
        )}
      >
        <div>
          <p className="text-sm font-bold text-emerald-950">학부모 리포트</p>
          <p className="mt-0.5 text-xs text-emerald-800">성장 변화 · 월별 추세 · 상세 점수</p>
        </div>
        <ParentGrowthHeroCard
          playerName={playerName}
          growthScore={growthScore}
          delta={growthScoreDelta}
          historySessions={historySessions}
          historyLoading={historyLoading}
        />
        <Step5GrowthTimelineCard
          teamId={teamId}
          playerName={playerName}
          playerId={growthPlayerId}
        />
        {coachAiSummary ? (
          <CoachGrowthAiSummaryPanel className="mt-3" coach={coachAiSummary.coach} />
        ) : null}
        <GrowthTrendCard
          timeline={monthlyTimeline}
          historyLoading={historyLoading}
          canExportTimelinePdf={canExportTimelinePdf}
          monthlyPdfExportPending={monthlyPdfExportPending}
          monthlyPdfExportNotice={monthlyPdfExportNotice}
          onExportMonthlyPdf={() => void handleExportMonthlyPdf()}
        />
        {growthScore ? (
          <GrowthScorePanel
            growthScore={growthScore}
            delta={growthScoreDelta}
            playerName={playerName}
            mobileWide={embedded}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-emerald-300 bg-white/70 px-4 py-3 text-sm text-emerald-900">
            코치가 훈련 장면을 확인·승인하면 성장 점수와 등급이 표시됩니다.
          </div>
        )}
        {verifiedItems.length > 0 ? (
          <div
            className="rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-3"
            data-testid="step5-save-session-bar"
          >
            <p className="text-sm font-semibold text-blue-950">코치 · 훈련 기록 저장</p>
            <p className="mt-1 text-xs leading-relaxed text-blue-800">
              지난 훈련 비교·PDF 비교 섹션은 Firestore에 저장된 세션이 있어야 표시됩니다. 같은 선수로{" "}
              <strong>서로 다른 영상</strong>을 2회 이상 저장하면 비교가 활성화됩니다.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="bg-blue-700 hover:bg-blue-800"
                disabled={historySavePending || historyLoading}
                data-testid="step5-save-session-button"
                onClick={() => void saveSessionToGrowthHistory()}
              >
                {historySavePending ? "저장 중…" : "훈련 세션 저장"}
              </Button>
              {historySource ? (
                <span className="text-[11px] text-blue-700">
                  이력 {historySessions.length}건 · {historySource === "firestore" ? "Firestore" : "로컬"}
                </span>
              ) : null}
            </div>
            {historySavedNotice ? (
              <p className="mt-2 whitespace-pre-line text-xs font-medium text-blue-900">{historySavedNotice}</p>
            ) : null}
            {levelUpCelebration ? (
              <LevelUpCelebrationCard
                className="mt-3"
                event={levelUpCelebration}
                onDismiss={() => setLevelUpCelebration(null)}
              />
            ) : null}
            {badgeUnlockCelebration ? (
              <BadgeUnlockCelebrationCard
                className="mt-3"
                event={badgeUnlockCelebration}
                onDismiss={() => setBadgeUnlockCelebration(null)}
              />
            ) : null}
            {deliveryPending ? (
              <p className="mt-2 text-xs text-blue-700">PDF 업로드 · 보호자 링크 생성 중…</p>
            ) : null}
          </div>
        ) : null}

        <ParentGrowthSharePanel
          teamId={teamId}
          playerId={growthPlayerId ?? ""}
          sessionDocId={activeGrowthShare?.sessionDocId ?? null}
          playerName={playerName}
          growthScore={growthScore}
          shareUrl={activeGrowthShare?.shareUrl ?? null}
          delivery={activeGrowthShare?.delivery ?? null}
          deliveryPending={deliveryPending}
          pdfDownloadPending={pdfExportPending}
          onDownloadPdf={handleExportPdf}
          onDeliveryUpdated={(nextDelivery) => {
            setLastDelivery((prev) =>
              prev ? { ...prev, delivery: nextDelivery } : prev
            );
            setHistorySessions((sessions) =>
              sessions.map((s) =>
                s.sessionId === activeGrowthShare?.sessionDocId
                  ? { ...s, delivery: nextDelivery }
                  : s
              )
            );
          }}
          className="mt-3"
        />
      </section>

      <ReportMetadataBar metadata={reportMetadata} />
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        Coach-verified growth evidence 문서 · 톤: {reportToneLabel(reportTone)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {REPORT_TONE_OPTIONS.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant={reportTone === opt.id ? "default" : "outline"}
            onClick={() => setReportTone(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          disabled={pdfExportPending || verifiedItems.length === 0}
          onClick={() => void handleExportPdf()}
        >
          {pdfExportPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {pdfExportPending ? "PDF 생성 중..." : "PDF 생성"}
        </Button>
      </div>
      {pdfExportNotice ? (
        <p
          className={cn(
            "text-xs",
            pdfExportNotice.includes("실패") || pdfExportNotice.includes("필요")
              ? "text-red-700"
              : "text-emerald-800"
          )}
        >
          {pdfExportNotice}
        </p>
      ) : null}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{playerName || "선수"} 리포트 요약</p>
        <p className="mt-2 text-sm text-gray-700">검증된 이벤트 수: {verifiedItems.length}</p>
        <p className="mt-2 text-xs text-gray-600">많이 나온 이벤트 Top 3</p>
        <ul className="mt-1 list-inside list-disc text-sm text-gray-800">
          {topEventTypes.length === 0 ? (
            <li>승인된 이벤트가 없습니다.</li>
          ) : (
            topEventTypes.map(([event, count]) => (
              <li key={event}>
                {getEventCopy(event).labelKo} · {count}회
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3">
        <p className="text-sm font-semibold text-violet-900">{narrative.headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-violet-900">{narrative.opening}</p>
        {narrative.body.map((paragraph) => (
          <p key={paragraph.slice(0, 24)} className="mt-2 text-sm leading-relaxed text-violet-900/95">
            {paragraph}
          </p>
        ))}
        {narrative.eventBlocks.length > 0 ? (
          <div className="mt-4 space-y-4">
            {narrative.eventBlocks.map((block) => (
              <GuardianReportBlockCard
                key={block.eventId}
                block={block}
                selected={selectedEventId === block.eventId}
                onSeek={() => {
                  onSelectEvent(block.eventId);
                  onSeekFromReport(block.seekSeconds);
                }}
              />
            ))}
          </div>
        ) : null}
        <p className="mt-3 text-[11px] font-medium text-violet-700">{narrative.footer}</p>
      </div>
      <div className="space-y-2 rounded-xl border border-gray-200 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">검증 이벤트 타임라인 (클릭 → 영상 seek)</p>
        {narrative.eventLines.length === 0 ? (
          <p className="text-sm text-gray-500">표시할 검증 이벤트가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {narrative.eventLines.map((line) => (
              <li key={line.eventId}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                    selectedEventId === line.eventId
                      ? "border-violet-400 bg-violet-50"
                      : "border-gray-200 bg-white hover:border-violet-200"
                  )}
                  onClick={() => {
                    onSelectEvent(line.eventId);
                    onSeekFromReport(line.seekSeconds);
                  }}
                >
                  <span className="font-mono text-xs font-semibold text-violet-800">
                    {formatSeconds(line.seekSeconds)}
                  </span>{" "}
                  <code className="text-xs text-violet-900">{line.eventType}</code>
                  <span className="mt-1 block text-gray-800">{line.line}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <details
        className="rounded-xl border border-gray-200 bg-gray-50/50"
        open={historySessions.length === 0 && verifiedItems.length > 0}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-700 marker:content-none [&::-webkit-details-marker]:hidden">
          코치·상세 분석 (선택) — Growth Trend Dashboard · OVR
        </summary>
        <div className="space-y-4 border-t border-gray-200 px-4 pb-4 pt-3">
          <SeasonGrowthDashboardPanel
            report={seasonGrowthReport}
            availableSeasons={availableSeasons}
            selectedSeasonId={selectedSeason.id}
            historyLoading={historyLoading}
            seasonPdfExportPending={seasonPdfExportPending}
            seasonPdfExportNotice={seasonPdfExportNotice}
            onSelectSeason={setSelectedSeason}
            onExportSeasonPdf={() => void handleExportSeasonPdf()}
          />
          <PlayerOvrEnginePanel
            playerName={playerName}
            ovrProfile={ovrProfile}
            seasonReport={seasonGrowthReport}
            growthScoreOverall={growthScore?.snapshot.overall ?? null}
            ovrLoading={ovrLoading}
            ovrActionPending={ovrActionPending}
            ovrNotice={ovrNotice}
            onSyncFromSession={() => void handleSyncOvrFromSession()}
            onApplySeasonOvr={() => void handleApplySeasonOvr()}
          />
          <PlayerAvatarGrowthPanel
            playerName={playerName}
            avatarProfile={avatarProfile}
            ovrProfile={ovrProfile}
            loading={ovrLoading}
          />
          <GrowthTrendDashboardPanel
            trendWindow={trendWindow}
            onChangeWindow={setTrendWindow}
            dashboard={trendDashboard}
            historySource={historySource}
            historyLoading={historyLoading}
            historySavedNotice={historySavedNotice}
            historySavePending={historySavePending}
            onSaveSession={() => void saveSessionToGrowthHistory()}
          />
          <div className="space-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Evidence-first · 코치 검증 근거</p>
            {evidenceItems.length === 0 ? (
              <p className="text-sm text-gray-500">코치 검증 이벤트가 없어 근거 카드를 생성할 수 없습니다.</p>
            ) : (
              evidenceItems.map((item) => (
                <EvidenceFirstCard
                  key={item.eventId}
                  item={item}
                  selected={selectedEventId === item.eventId}
                  showTechnicalConfidence={reportTone === "technical"}
                  onSeek={() => {
                    onSelectEvent(item.eventId);
                    onSeekFromReport(item.seekSeconds);
                  }}
                />
              ))
            )}
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">read-aloud 반응 기록</span>
            <textarea
              rows={3}
              value={readAloudNote}
              onChange={(e) => onChangeReadAloudNote(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              placeholder="예: '침착함이 늘었어요' 표현에서 과거 부족 뉘앙스 오해 1건"
            />
          </label>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
            AI 제안은 참고용이며, 최종 판단은 코치가 수행합니다.
          </div>
        </div>
      </details>
      <Button type="button" variant="ghost" onClick={onBack}>
        ← 이전
      </Button>
    </div>
  );
}

function GrowthTrendDashboardPanel({
  trendWindow,
  onChangeWindow,
  dashboard,
  historySource,
  historyLoading,
  historySavedNotice,
  historySavePending,
  onSaveSession,
}: {
  trendWindow: GrowthTrendWindow;
  onChangeWindow: (w: GrowthTrendWindow) => void;
  dashboard: ReturnType<typeof computeGrowthTrendDashboard>;
  historySource: "firestore" | "local" | null;
  historyLoading: boolean;
  historySavedNotice: string | null;
  historySavePending: boolean;
  onSaveSession: () => void;
}) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-blue-900">Growth Trend Dashboard</p>
        {historySource ? (
          <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] text-blue-800">
            source: {historySource === "firestore" ? "Firestore canonical" : "local fallback"}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {TREND_WINDOW_OPTIONS.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant={trendWindow === opt.id ? "default" : "outline"}
            onClick={() => onChangeWindow(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {historyLoading ? (
        <p className="mt-2 text-xs text-blue-800">성장 이력 불러오는 중...</p>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {typeof dashboard.aggregated.growthScore?.overall === "number" &&
            dashboard.aggregated.growthScore.overall > 0 ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-2 text-center">
                <p className="text-[10px] text-indigo-600">Growth Score (avg)</p>
                <p className="text-lg font-bold text-indigo-950">
                  {dashboard.aggregated.growthScore.overall}
                </p>
              </div>
            ) : null}
            <div className="rounded-lg border border-blue-100 bg-white px-2 py-2 text-center">
              <p className="flex items-center justify-center text-[10px] text-gray-500">
                <GlossaryTooltip termId="SCAN" />
              </p>
              <p className="text-lg font-bold text-blue-900">{dashboard.aggregated.scanCount}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-white px-2 py-2 text-center">
              <p className="flex items-center justify-center text-[10px] text-gray-500">
                <GlossaryTooltip termId="PRESS" label="PRESS" />
              </p>
              <p className="text-lg font-bold text-blue-900">
                {dashboard.aggregated.pressureResistanceCount}
              </p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-white px-2 py-2 text-center">
              <p className="text-[10px] text-gray-500">QUICK_RECOVERY</p>
              <p className="text-lg font-bold text-blue-900">{dashboard.aggregated.recoveryCount}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-blue-800">
            coach confirmation avg {Math.round(dashboard.confirmedRatioAvg * 100)}% · edited ratio avg{" "}
            {Math.round(dashboard.aggregated.editedRatio * 100)}% · sessions {dashboard.sessionCount}
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-blue-900">
            {dashboard.narratives.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3"
        disabled={historySavePending}
        onClick={onSaveSession}
      >
        {historySavePending ? "저장 중…" : "세션 저장 (상세 패널)"}
      </Button>
      {historySavedNotice ? (
        <p className="mt-1 text-[11px] text-blue-800">{historySavedNotice}</p>
      ) : null}
    </div>
  );
}

function GrowthScorePanel({
  growthScore,
  delta,
  playerName,
  mobileWide = false,
}: {
  growthScore: GrowthScoreResult;
  delta: ReturnType<typeof compareGrowthScoreToHistory> | null;
  playerName: string;
  mobileWide?: boolean;
}) {
  const overall = growthScore.snapshot.overall;
  const letterGrade = scoreToGrowthLetterGrade(overall);
  const gradeTagline = letterGrade
    ? growthLetterGradeHint(letterGrade)
    : growthScore.parentHint;
  const strengths = pickPrimaryStrengths(growthScore.dimensions);
  const profileRadar = computeGrowthProfileRadar(growthScore);

  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50/80",
        mobileWide ? "px-3 py-3 sm:px-4 sm:py-4" : "px-4 py-4"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">현재 성장 수준</p>
          <p className="mt-1 text-[11px] text-indigo-600">
            {playerName.trim() || "선수"} · 코치가 검증한 훈련 장면 기준
          </p>
          {letterGrade && isLiteReportGrade(letterGrade) ? (
            <div className="mt-3">
              <LiteReportGradeBadge
                grade={letterGrade}
                className="px-5 py-2 text-3xl"
                data-testid="growth-score-letter-grade"
              />
            </div>
          ) : (
            <p className="mt-3 text-3xl font-black text-indigo-950">{growthScore.parentLabel}</p>
          )}
          <p className="mt-2 text-3xl font-black tabular-nums text-indigo-950">
            {overall}
            <span className="text-lg font-bold">점</span>
          </p>
          <p className="mt-2 max-w-none text-sm font-medium leading-relaxed text-indigo-800 sm:max-w-md">
            {gradeTagline}
          </p>
        </div>
      </div>

      <GlossaryQuickBar className="mt-3 border-indigo-200/80 bg-white/60" />

      {strengths.length > 0 ? (
        <div className="mt-3 rounded-lg border border-indigo-200/80 bg-white/70 px-3 py-2">
          <p className="text-[10px] font-semibold text-indigo-800">주요 강점</p>
          <ul className="mt-1 space-y-0.5">
            {strengths.map((s) => (
              <li key={s} className="text-xs text-indigo-900">
                ✓ {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {delta?.narrative ? (
        <p className="mt-3 rounded-lg border border-indigo-200/80 bg-white/70 px-3 py-2 text-xs font-medium text-indigo-900">
          {delta.narrative}
        </p>
      ) : null}

      <p className="mt-2 text-[10px] text-indigo-600">상세 분석 · 코치 검증 축</p>

      {profileRadar.hasObservedData ? (
        <div className="mt-4 rounded-lg border border-indigo-200/80 bg-white/80 px-3 py-3">
          <GrowthProfileRadarChart profile={profileRadar} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {profileRadar.axes.map((axis) => (
              <div
                key={axis.key}
                className="rounded-md border border-indigo-100 bg-indigo-50/50 px-2 py-1.5 text-center"
              >
                <p className="text-[10px] font-semibold text-indigo-800">{axis.labelKo}</p>
                <p className="text-sm font-bold tabular-nums text-indigo-950">
                  {formatDimensionScoreDisplay(axis.score)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-[10px] font-semibold text-indigo-800">코치 검증 축</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {growthScore.dimensions.map((dim) => (
          <div
            key={dim.key}
            className="rounded-lg border border-indigo-100 bg-white/90 px-3 py-2"
          >
            <p className="text-sm font-bold text-indigo-950">{dim.labelKo}</p>
            <p className="text-[10px] text-gray-400">{dim.label}</p>
            <p
              className={cn(
                "mt-1 font-bold text-indigo-950",
                dim.score !== null ? "text-xl tabular-nums" : "text-[11px] text-gray-500"
              )}
            >
              {formatDimensionScoreDisplay(dim.score)}
            </p>
            <p className="text-[10px] text-gray-500">
              가중치 {Math.round(dim.weight * 100)}%
              {dim.eventCount > 0 ? ` · ${dim.eventCount}건` : " · 미관찰"}
            </p>
            {dim.score !== null ? (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${dim.score}%` }}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-indigo-600">
        합산: <GlossaryTooltip termId="SCAN" />×{GROWTH_SCORE_WEIGHTS.SCAN} +{" "}
        <GlossaryTooltip termId="PRESS" />×{GROWTH_SCORE_WEIGHTS.PRESS_RESIST} +
        RECOVERY×{GROWTH_SCORE_WEIGHTS.QUICK_RECOVERY}
        {growthScore.dimensions.some((d) => d.score === null)
          ? " (미관찰 축은 제외 후 재가중)"
          : ""}
      </p>

      {isFiiEngineV1Enabled() ? (
        <FiiScoreRationaleCard growthScore={growthScore} className="mt-4 border-indigo-200" />
      ) : null}
      {isFiiEngineV1Enabled() && isTacticalAgentV1Enabled() ? (
        <TacticalTrainingRecommendationCard growthScore={growthScore} className="mt-4" />
      ) : null}
    </div>
  );
}

function SeasonGrowthDashboardPanel({
  report,
  availableSeasons,
  selectedSeasonId,
  historyLoading,
  seasonPdfExportPending,
  seasonPdfExportNotice,
  onSelectSeason,
  onExportSeasonPdf,
}: {
  report: ReturnType<typeof buildSeasonGrowthReport>;
  availableSeasons: SeasonWindow[];
  selectedSeasonId: string;
  historyLoading: boolean;
  seasonPdfExportPending: boolean;
  seasonPdfExportNotice: string | null;
  onSelectSeason: (season: SeasonWindow) => void;
  onExportSeasonPdf: () => void;
}) {
  const canExport =
    (report.timeline.hasEnoughData && report.timeline.points.length >= 2) ||
    report.kpi.totalSessions >= 2;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-violet-900">시즌 성장 대시보드</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5 border-violet-300 bg-white text-violet-900 hover:bg-violet-50"
          disabled={!canExport || seasonPdfExportPending || historyLoading}
          onClick={onExportSeasonPdf}
        >
          {seasonPdfExportPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {seasonPdfExportPending ? "시즌 PDF 생성 중..." : "시즌 PDF"}
        </Button>
      </div>
      <p className="mt-0.5 text-[11px] text-violet-800">
        {report.season.label} · 얼마나 성장했는가 (playerGrowthHistory 집계)
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {availableSeasons.map((season) => (
          <Button
            key={season.id}
            type="button"
            size="sm"
            variant={selectedSeasonId === season.id ? "default" : "outline"}
            onClick={() => onSelectSeason(season)}
          >
            {season.label}
          </Button>
        ))}
      </div>

      {historyLoading ? (
        <p className="mt-2 text-xs text-violet-800">이력 불러오는 중...</p>
      ) : report.kpi.totalSessions === 0 ? (
        <p className="mt-2 text-xs text-violet-800">
          이 시즌에 저장된 세션이 없습니다. Step5에서 세션을 저장해 주세요.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-violet-100 bg-white px-2 py-2 text-center">
              <p className="text-[10px] text-gray-500">검증 세션</p>
              <p className="text-lg font-bold text-violet-950">{report.kpi.totalSessions}회</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-white px-2 py-2 text-center">
              <p className="text-[10px] text-gray-500">평균 Score</p>
              <p className="text-lg font-bold text-violet-950">{report.kpi.avgGrowthScore}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-white px-2 py-2 text-center">
              <p className="text-[10px] text-gray-500">최고</p>
              <p className="text-lg font-bold text-violet-950">{report.kpi.maxScore}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-white px-2 py-2 text-center">
              <p className="text-[10px] text-gray-500">최저</p>
              <p className="text-lg font-bold text-violet-950">{report.kpi.minScore}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-white px-2 py-2 text-center">
              <p className="text-[10px] text-gray-500">검증 이벤트</p>
              <p className="text-lg font-bold text-violet-950">{report.kpi.totalVerifiedEvents}건</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-white px-2 py-2 text-center">
              <p className="text-[10px] text-gray-500">승인율</p>
              <p className="text-lg font-bold text-violet-950">{report.kpi.approvalRatePct}%</p>
            </div>
          </div>

          {report.firstOverall !== null && report.lastOverall !== null ? (
            <p className="mt-2 text-xs font-semibold text-violet-900">
              Growth Score {report.firstOverall} → {report.lastOverall}
              {report.spanDelta !== null ? ` (${report.spanDelta > 0 ? "+" : ""}${report.spanDelta})` : ""}
            </p>
          ) : null}

          {report.timeline.points.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              {report.timeline.points.map((p) => (
                <div
                  key={p.monthKey}
                  className="flex min-w-[56px] flex-col items-center rounded-lg border border-violet-100 bg-white px-2 py-1.5"
                >
                  <span className="text-[10px] text-gray-500">{p.label}</span>
                  <span className="text-base font-bold text-violet-950">{p.overall}</span>
                </div>
              ))}
            </div>
          ) : null}

          {report.dimensionMvps.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-violet-900">
              {report.dimensionMvps.map((m) => (
                <li key={m.key}>
                  {m.medal} {m.labelKo} +{m.delta} ({m.firstScore} → {m.lastScore})
                </li>
              ))}
            </ul>
          ) : null}

          {report.ovrImpact ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
              <p className="font-semibold">
                시즌 OVR 예상 {report.ovrImpact.before.ovr} → {report.ovrImpact.after.ovr} (
                {report.ovrImpact.ovrDelta > 0 ? "+" : ""}
                {report.ovrImpact.ovrDelta})
              </p>
              {report.ovrImpact.statChanges.map((c) => (
                <p key={c.label} className="mt-0.5 text-[11px]">
                  {c.label} {c.from} → {c.to} ({c.delta > 0 ? "+" : ""}
                  {c.delta})
                </p>
              ))}
            </div>
          ) : null}

          {!canExport ? (
            <p className="mt-2 text-[11px] text-amber-800">
              시즌 PDF는 해당 시즌 세션 2회 이상 또는 서로 다른 달 2개월 데이터가 필요합니다.
            </p>
          ) : null}
        </>
      )}

      {seasonPdfExportNotice ? (
        <p
          className={cn(
            "mt-2 text-xs",
            seasonPdfExportNotice.includes("실패") || seasonPdfExportNotice.includes("필요")
              ? "text-red-700"
              : "text-violet-800"
          )}
        >
          {seasonPdfExportNotice}
        </p>
      ) : null}
    </div>
  );
}

function PlayerAvatarGrowthPanel({
  playerName,
  avatarProfile,
  ovrProfile,
  loading,
}: {
  playerName: string;
  avatarProfile: PlayerGrowthAvatarDoc | null;
  ovrProfile: PlayerGrowthOvrDoc | null;
  loading: boolean;
}) {
  const stats = avatarProfile ?? ovrProfile;
  const hints =
    stats && !loading
      ? nextBadgeHints({
          vision: stats.vision,
          pressure: stats.pressure,
          recovery: stats.recovery,
          ovr: avatarProfile?.ovr ?? stats.ovr ?? 0,
          sessionCount: avatarProfile?.sessionCount,
        })
      : [];

  return (
    <div className="space-y-2">
      <PlayerGrowthAvatarCard
        playerName={playerName}
        avatar={avatarProfile}
        loading={loading}
        variant="full"
      />
      {hints.length > 0 ? (
        <div className="rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-600">다음 배지까지</p>
          {hints.map(({ badge, remaining, unit }) => (
            <p key={badge.id} className="text-[11px] text-gray-700">
              {badge.labelKo}:{" "}
              {unit === "session"
                ? `${remaining}회 더`
                : unit === "ovr"
                  ? `OVR +${remaining}`
                  : `+${remaining} 필요`}{" "}
              ({badge.descriptionKo})
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlayerOvrEnginePanel({
  playerName,
  ovrProfile,
  seasonReport,
  growthScoreOverall,
  ovrLoading,
  ovrActionPending,
  ovrNotice,
  onSyncFromSession,
  onApplySeasonOvr,
}: {
  playerName: string;
  ovrProfile: PlayerGrowthOvrDoc | null;
  seasonReport: ReturnType<typeof buildSeasonGrowthReport>;
  growthScoreOverall: number | null;
  ovrLoading: boolean;
  ovrActionPending: boolean;
  ovrNotice: string | null;
  onSyncFromSession: () => void;
  onApplySeasonOvr: () => void;
}) {
  const impact = seasonReport.ovrImpact;

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 px-4 py-3">
      <p className="text-sm font-semibold text-amber-950">OVR Engine</p>
      <p className="mt-0.5 text-[11px] text-amber-900">
        Growth Score → Vision / Pressure / Recovery → OVR (가중치 40% · 35% · 25%)
      </p>

      {ovrLoading ? (
        <p className="mt-2 text-xs text-amber-900">OVR 프로필 불러오는 중...</p>
      ) : ovrProfile ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-center sm:col-span-1">
            <p className="text-[10px] font-semibold uppercase text-amber-800">OVR</p>
            <p className="text-3xl font-black text-amber-950">{ovrProfile.ovr}</p>
            {growthScoreOverall !== null ? (
              <p className="text-[10px] text-gray-500">이번 세션 GS {growthScoreOverall}</p>
            ) : null}
          </div>
          <div className="rounded-lg border border-amber-100 bg-white px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500">Vision</p>
            <p className="text-xl font-bold text-amber-950">{ovrProfile.vision}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-white px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500">Pressure</p>
            <p className="text-xl font-bold text-amber-950">{ovrProfile.pressure}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-white px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500">Recovery</p>
            <p className="text-xl font-bold text-amber-950">{ovrProfile.recovery}</p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-900">
          {playerName.trim() || "선수"} OVR 프로필이 없습니다. 아래 「최신 세션 → OVR 동기화」로 시작하세요.
        </p>
      )}

      {impact ? (
        <div className="mt-3 rounded-lg border border-amber-300/80 bg-white/80 px-3 py-2">
          <p className="text-xs font-semibold text-amber-950">시즌 성장 결과 (예상)</p>
          <p className="mt-1 text-sm font-bold text-amber-950">
            OVR {impact.before.ovr} → {impact.after.ovr} ({impact.ovrDelta > 0 ? "+" : ""}
            {impact.ovrDelta})
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-amber-300"
          disabled={ovrActionPending || growthScoreOverall === null}
          onClick={onSyncFromSession}
        >
          {ovrActionPending ? "처리 중..." : "최신 세션 → OVR 동기화"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="bg-amber-800 text-white hover:bg-amber-900"
          disabled={ovrActionPending || !impact}
          onClick={onApplySeasonOvr}
        >
          {ovrActionPending ? "처리 중..." : "시즌 OVR 반영"}
        </Button>
      </div>

      {ovrProfile?.lastSeason ? (
        <p className="mt-1 text-[10px] text-amber-800">마지막 시즌 반영: {ovrProfile.lastSeason}</p>
      ) : null}

      {ovrNotice ? (
        <p
          className={cn(
            "mt-2 text-xs",
            ovrNotice.includes("실패") || ovrNotice.includes("없") ? "text-red-700" : "text-amber-900"
          )}
        >
          {ovrNotice}
        </p>
      ) : null}
    </div>
  );
}

function VerificationBadgeBar({
  summary,
}: {
  summary: ReturnType<typeof buildVerificationSummaryMerged>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
        <Check className="h-3.5 w-3.5" />
        Coach Verified
      </span>
      <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs text-emerald-900">
        {summary.reviewedCount} events reviewed
      </span>
      <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs text-emerald-900">
        {summary.confirmedCount} confirmed
      </span>
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
        {summary.editedCount} edited
      </span>
      {summary.rejectedCount > 0 ? (
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
          {summary.rejectedCount} rejected
        </span>
      ) : null}
    </div>
  );
}

function ReportMetadataBar({
  metadata,
}: {
  metadata: ReturnType<typeof buildReportMetadata>;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
      <p>
        <span className="font-semibold text-gray-800">generatedAt:</span>{" "}
        {formatReportGeneratedAt(metadata.generatedAt)}
      </p>
      <p>
        <span className="font-semibold text-gray-800">reviewedBy:</span> {metadata.reviewedBy}
      </p>
      <p>
        <span className="font-semibold text-gray-800">reviewedEventCount:</span>{" "}
        {metadata.reviewedEventCount}
      </p>
      <p>
        <span className="font-semibold text-gray-800">tone:</span> {reportToneLabel(metadata.tone)}
      </p>
      <p>
        <span className="font-semibold text-gray-800">videoId:</span> {metadata.videoId ?? "N/A"}
      </p>
    </div>
  );
}

function GuardianReportBlockCard({
  block,
  selected,
  onSeek,
}: {
  block: GuardianEventReportBlock;
  selected: boolean;
  onSeek: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white/80 px-3 py-3",
        selected ? "border-violet-400 ring-1 ring-violet-200" : "border-violet-200"
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-bold leading-snug text-violet-950">{block.labelKo}</p>
        <button
          type="button"
          className="shrink-0 font-mono text-xs font-semibold text-violet-700 underline-offset-2 hover:underline"
          onClick={onSeek}
        >
          {block.atLabel} · 영상 보기
        </button>
      </div>
      <dl className="mt-3 space-y-2 text-sm text-violet-950">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-violet-600">무엇을 잘했는가</dt>
          <dd className="mt-0.5 leading-relaxed">{block.behavior}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">왜 중요한가</dt>
          <dd className="mt-0.5 leading-relaxed">{block.meaning}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-blue-700">다음 훈련</dt>
          <dd className="mt-0.5 leading-relaxed">{block.training}</dd>
        </div>
      </dl>
    </div>
  );
}

function EvidenceFirstCard({
  item,
  selected,
  showTechnicalConfidence,
  onSeek,
}: {
  item: EvidenceReportItem;
  selected: boolean;
  showTechnicalConfidence: boolean;
  onSeek: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-3",
        selected ? "border-violet-400 bg-violet-50/80" : "border-gray-200 bg-white"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-semibold text-violet-900">
          {item.eventType}
        </code>
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
          {item.coachVerifiedLabel}
        </span>
        {showTechnicalConfidence ? (
          <>
            <ConfidenceBadge level={item.confidence} />
            <span className="text-[10px] text-gray-500">AI confidence</span>
          </>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-900">
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">행동</span>
        <span className="mt-0.5 block">{item.claim}</span>
      </p>
      <p className="mt-2 text-xs text-gray-800">
        <span className="font-semibold text-emerald-800">의미</span> · {item.meaning}
      </p>
      <p className="mt-1 text-xs text-gray-800">
        <span className="font-semibold text-blue-800">다음 훈련</span> · {item.training}
      </p>
      <p className="mt-2 text-xs text-gray-700">
        <span className="font-semibold">근거 영상</span> ·{" "}
        <button type="button" className="font-mono underline-offset-2 hover:underline" onClick={onSeek}>
          {formatSeconds(item.seekSeconds)} (seek)
        </button>
      </p>
      <p className="mt-1 text-xs text-gray-700">
        <span className="font-semibold">Transcript:</span> {item.transcript}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        <span className="font-semibold">원문 evidence:</span> {item.evidence}
      </p>
      <p className="mt-1 text-xs text-gray-700">
        <span className="font-semibold">Coach note:</span> {item.coachNote ?? "없음"}
      </p>
    </div>
  );
}

function formatSeconds(second: number) {
  const m = Math.floor(second / 60);
  const s = Math.floor(second % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildTranscriptSnippet(event: MockGrowthEvent, segments: TranscriptSegment[]): string {
  const hit = segments
    .filter((segment) => segment.end >= event.transcriptStart && segment.start <= event.transcriptEnd)
    .map((segment) => segment.text.trim())
    .filter(Boolean);
  return hit.length > 0 ? hit.join(" ") : event.evidence;
}

type YoutubePlayerHandle = {
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  destroy?: () => void;
};

function mapYoutubeState(state: number): PlayerUiState {
  if (state === 1) return "playing";
  if (state === 2) return "paused";
  if (state === 3) return "buffering";
  if (state === 0) return "ended";
  if (state === 5) return "cued";
  return "unstarted";
}

declare global {
  interface Window {
    YT?: {
      Player?: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
            onStateChange?: (evt: { data: number }) => void;
          };
        }
      ) => YoutubePlayerHandle;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapServerStageToUiStatus(
  stage: "extracting_audio" | "transcribing" | "normalizing" | "completed"
): TranscriptIngestionStatus {
  if (stage === "extracting_audio") return "extracting";
  if (stage === "completed" || stage === "normalizing") return "ready";
  return "transcribing";
}

async function pollIngestionUntilCompleted(
  teamId: string,
  jobId: string,
  setStatus: (status: TranscriptIngestionStatus) => void
): Promise<string> {
  for (let i = 0; i < 40; i += 1) {
    await sleep(1200);
    const status = await callGetYoutubeIngestionStatus({ teamId, jobId });
    if (status.status === "failed") {
      setStatus("failed");
      throw new Error(status.lastError?.message ?? "ingestion 실패");
    }
    setStatus(mapServerStageToUiStatus(status.stage));
    if (status.status === "completed" && status.transcriptId) {
      return status.transcriptId;
    }
  }
  throw new Error("ingestion timeout: 잠시 후 다시 시도해주세요.");
}

function inferTranscriptLanguageFromSegments(segments: TranscriptSegment[]): string | null {
  const text = segments.map((s) => s.text).join(" ");
  if (/[\uAC00-\uD7A3\u3131-\u318E]/.test(text)) return "ko";
  if (/[A-Za-z]/.test(text)) return "en";
  return null;
}

function resolveIngestionVerdict(input: {
  inputMode: TranscriptInputMode;
  ingestionStatus: TranscriptIngestionStatus;
  ingestionProvider: string | null;
  ingestionSegmentCount: number | null;
  transcriptSegments: TranscriptSegment[];
}): IngestionVerdict {
  if (input.ingestionStatus === "extracting" || input.ingestionStatus === "transcribing") {
    return "running";
  }
  if (input.ingestionProvider?.startsWith("mock")) return "mock";
  /** 샘플 3줄은 수동 데모 — 운영에서 Mock Whisper 오판 방지 */
  if (
    input.inputMode === "ingested" &&
    segmentsLookLikeMockTranscript(input.transcriptSegments)
  ) {
    return "mock";
  }
  if (input.ingestionStatus === "failed") return "failed";
  if (input.ingestionProvider === "whisper" && (input.ingestionSegmentCount ?? 0) > 0) {
    return "whisper";
  }
  if (input.inputMode === "ingested" && input.ingestionStatus !== "ready") {
    return "incomplete";
  }
  if (input.inputMode === "ingested" && input.ingestionStatus === "ready" && !input.ingestionProvider) {
    return "incomplete";
  }
  if (input.inputMode === "manual") return "manual";
  return "idle";
}

function segmentsLookLikeMockTranscript(segments: TranscriptSegment[]): boolean {
  if (segments.length === 0) return false;
  if (segments.length === MOCK_TRANSCRIPT_SEGMENTS.length) {
    return segments.every(
      (seg, index) =>
        MOCK_TRANSCRIPT_SEGMENTS[index]?.text === seg.text &&
        MOCK_TRANSCRIPT_SEGMENTS[index]?.start === seg.start &&
        MOCK_TRANSCRIPT_SEGMENTS[index]?.end === seg.end
    );
  }
  const single = segments.length === 1 ? segments[0] : null;
  if (single && single.start === 8 && single.end === 12 && single.text.includes("주변 보고 패스")) {
    return true;
  }
  return false;
}

function classifyIngestionError(error: unknown): {
  message: string;
  phase: "extract" | "transcribe" | "timeout" | null;
} {
  const raw = errorMessage(error);
  const phase = detectIngestionFailurePhase(raw, error);
  return { message: raw, phase };
}

function detectIngestionFailurePhase(
  message: string,
  error: unknown
): "extract" | "transcribe" | "timeout" | null {
  if (message.includes("[extract]") || /yt-dlp|ffmpeg|\/extract/i.test(message)) return "extract";
  if (message.includes("[transcribe]") || /whisper|\/transcribe/i.test(message)) return "transcribe";
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    if (code.includes("internal")) return "extract";
    if (
      code.includes("deadline-exceeded") ||
      code.includes("deadline") ||
      /timeout|초과/i.test(message)
    ) {
      return "timeout";
    }
  }
  if (/timeout|초과/i.test(message)) return "timeout";
  return null;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    const message = String((error as { message?: unknown }).message ?? "");
    if (code.includes("not-found")) {
      return "ingestion callable이 배포되지 않았습니다. Functions 배포 상태를 확인해주세요.";
    }
    if (code.includes("permission-denied")) {
      return "현재 계정에 ingestion 실행 권한이 없습니다. 코치/운영 권한으로 시도해주세요.";
    }
    if (code.includes("internal")) {
      if (!canRunYoutubeIngestion()) {
        return (
          youtubeIngestionBlockedReason() ??
          "운영 앱에서는 YouTube 자동 전사를 사용할 수 없습니다. 자막을 직접 입력해 주세요."
        );
      }
      return (
        message ||
        "Functions internal — 짧은 YouTube URL로 재시도하거나 emulator/worker 연결을 확인해 주세요."
      );
    }
    if (message) return message;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "ingestion 처리 중 오류가 발생했습니다.";
}
