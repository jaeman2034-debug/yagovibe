import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, Play, Sparkles } from "lucide-react";
import { LiteReportGradeBadge } from "@/components/team/LiteReportGradeBadge";
import { TeamAiAnalysisLiteProfileChart } from "@/components/team/TeamAiAnalysisLiteProfileChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  appendAnalysisHistoryItem,
  DUMMY_TEAM_AI_ANALYSIS_VIDEO_PREVIEW,
  formatAnalysisHistoryDate,
  generateRandomLiteReportSnapshot,
  isLiteReportGrade,
  isValidYoutubeUrl,
  LITE_REPORT_DIMENSION_ROWS,
  readAnalysisHistoryFromStorage,
  TEAM_AI_ANALYSIS_LITE_TAB,
  teamAiAnalysisLiteTabQuery,
  type AnalysisHistoryItem,
  type LiteReportSnapshot,
} from "@/lib/team/teamAiAnalysisLite";

/** Sprint 5 — 가짜 분석 대기 (Sprint 6+ 실제 ingestion 연동 전) */
const DUMMY_ANALYSIS_DELAY_MS = 1500;

const ANALYSIS_LOADING_STEPS = [
  { icon: "✓", label: "영상 확인", done: true },
  { icon: "⏳", label: "선수 움직임 추출...", done: false },
  { icon: "⏳", label: "활동량 계산...", done: false },
  { icon: "⏳", label: "AI 리포트 생성 중...", done: false },
] as const;

type Props = {
  teamId: string;
  teamName?: string;
  /** TeamHome 탭 패널에 임베드 */
  embedded?: boolean;
};

/**
 * 생활체육 팀 AI 분석 Lite — MVP v1 FROZEN (8A–8G UI, localStorage, 더미 리포트)
 * YouTube API(8B)·Whisper/GPT/Firestore는 Phase 2.
 */
export default function TeamAiAnalysisLitePage({
  teamId,
  teamName: _teamName,
  embedded = false,
}: Props) {
  const [url, setUrl] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>(
    () => readAnalysisHistoryFromStorage(),
  );
  const [reportSnapshot, setReportSnapshot] = useState<LiteReportSnapshot | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearAnalyzeTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetAnalysisOutput = () => {
    clearAnalyzeTimer();
    setIsAnalyzing(false);
    setShowReport(false);
    setReportSnapshot(null);
  };

  useEffect(() => {
    setAnalysisHistory(readAnalysisHistoryFromStorage());
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const trimmedUrl = url.trim();
  const trimmedPlayerName = playerName.trim();
  const urlIsValid = isValidYoutubeUrl(url);
  const showUrlError = url.length > 0 && !urlIsValid;
  const showUrlOk = trimmedUrl.length > 0 && urlIsValid;

  const canStart =
    trimmedUrl.length > 0 &&
    trimmedPlayerName.length > 0 &&
    urlIsValid;

  const reportPlayerName = playerName.trim() || "김민준";

  const handleAnalyze = (e: FormEvent) => {
    e.preventDefault();
    if (!canStart || isAnalyzing) return;

    clearAnalyzeTimer();
    setIsAnalyzing(true);
    setShowReport(false);

    const nameForHistory = trimmedPlayerName || "김민준";

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;

      const snapshot = generateRandomLiteReportSnapshot();
      setReportSnapshot(snapshot);

      const nextHistory = appendAnalysisHistoryItem({
        date: formatAnalysisHistoryDate(),
        playerName: nameForHistory,
        grade: snapshot.overall,
      });
      setAnalysisHistory(nextHistory);

      setIsAnalyzing(false);
      setShowReport(true);
    }, DUMMY_ANALYSIS_DELAY_MS);
  };

  return (
    <div
      className={embedded ? "space-y-6" : "w-full space-y-6 py-6"}
      data-testid="team-ai-analysis-lite"
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl" aria-hidden>
            ⚽
          </span>
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">AI 분석 Lite</h2>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            BETA
          </Badge>
          <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
          경기 영상 URL을 입력하면 AI가 선수 활동을 분석하고 성장 리포트를 생성합니다.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[1.55fr_0.95fr] lg:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">영상 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleAnalyze} data-testid="team-ai-analysis-lite-form">
                <div className="space-y-2">
                  <Label htmlFor="team-ai-lite-youtube-url">YouTube URL</Label>
                  <Input
                    id="team-ai-lite-youtube-url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    disabled={isAnalyzing}
                    aria-invalid={showUrlError}
                    aria-describedby={
                      showUrlError || showUrlOk ? "team-ai-lite-youtube-url-hint" : undefined
                    }
                    className={showUrlError ? "border-red-300 focus-visible:ring-red-400" : undefined}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      resetAnalysisOutput();
                    }}
                    data-testid="team-ai-analysis-lite-url"
                  />
                  {showUrlError ? (
                    <p
                      id="team-ai-lite-youtube-url-hint"
                      className="text-xs text-red-600"
                      role="alert"
                      data-testid="team-ai-analysis-lite-url-error"
                    >
                      ❌ 올바른 YouTube URL을 입력해주세요.
                    </p>
                  ) : showUrlOk ? (
                    <p
                      id="team-ai-lite-youtube-url-hint"
                      className="text-xs text-emerald-700"
                      data-testid="team-ai-analysis-lite-url-ok"
                    >
                      ✓ YouTube URL 확인됨
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-ai-lite-player-name">선수 이름</Label>
                  <Input
                    id="team-ai-lite-player-name"
                    type="text"
                    autoComplete="name"
                    placeholder="예: 김민준"
                    value={playerName}
                    disabled={isAnalyzing}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      resetAnalysisOutput();
                    }}
                    data-testid="team-ai-analysis-lite-player-name"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full sm:w-auto sm:min-w-[140px]"
                  disabled={!canStart || isAnalyzing}
                  data-testid="team-ai-analysis-lite-start"
                >
                  {isAnalyzing ? "분석 중..." : "분석 시작"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {showUrlOk ? (
            <Card
              className="border-gray-200 shadow-sm"
              data-testid="team-ai-analysis-lite-video-info"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">⚽ 영상 정보</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4 pt-0 sm:gap-5">
                <div
                  className="relative flex aspect-video w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 sm:w-40"
                  data-testid="team-ai-analysis-lite-video-thumbnail"
                >
                  <Play className="h-8 w-8 text-gray-500/80" aria-hidden />
                  <span className="absolute bottom-1 left-1 right-1 truncate text-center text-[9px] font-medium uppercase tracking-wide text-gray-600">
                    {DUMMY_TEAM_AI_ANALYSIS_VIDEO_PREVIEW.thumbnailPlaceholder}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500">제목</p>
                    <p
                      className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900 sm:text-base"
                      data-testid="team-ai-analysis-lite-video-title"
                    >
                      {DUMMY_TEAM_AI_ANALYSIS_VIDEO_PREVIEW.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">채널</p>
                    <p
                      className="mt-0.5 text-sm text-gray-800 sm:text-base"
                      data-testid="team-ai-analysis-lite-video-channel"
                    >
                      {DUMMY_TEAM_AI_ANALYSIS_VIDEO_PREVIEW.channelName}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isAnalyzing ? (
            <Card
              className="border-violet-200 bg-violet-50/70 shadow-sm"
              data-testid="team-ai-analysis-lite-loading"
            >
              <CardContent className="space-y-4 py-5" role="status" aria-live="polite" aria-busy="true">
                <div className="flex items-center justify-center gap-2 text-violet-900">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  <p className="text-sm font-semibold sm:text-base">⚽ 영상 분석 중...</p>
                </div>
                <ul className="space-y-2.5 text-sm sm:columns-2 sm:gap-8">
                  {ANALYSIS_LOADING_STEPS.map((step) => (
                    <li
                      key={step.label}
                      className={
                        step.done
                          ? "font-medium text-emerald-800 sm:break-inside-avoid"
                          : "text-violet-800/85 sm:break-inside-avoid"
                      }
                    >
                      <span className="mr-2" aria-hidden>
                        {step.icon}
                      </span>
                      {step.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <section
          className="space-y-2 lg:sticky lg:top-4"
          data-testid="team-ai-analysis-lite-history"
        >
          <h3 className="text-sm font-semibold text-gray-900 sm:text-base">최근 분석 기록</h3>
          {analysisHistory.length === 0 ? (
            <p
              className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500"
              data-testid="team-ai-analysis-lite-history-empty"
            >
              아직 분석 기록이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {analysisHistory.map((row, index) => (
                <li key={`${row.date}-${row.playerName}-${index}`}>
                  <Card className="border-gray-200 shadow-sm">
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">{row.date}</p>
                        <p className="truncate text-sm font-medium text-gray-900">
                          {row.playerName}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-xs text-gray-500">종합</span>
                        {isLiteReportGrade(row.grade) ? (
                          <LiteReportGradeBadge grade={row.grade} />
                        ) : (
                          <span className="text-sm font-semibold tabular-nums text-violet-700">
                            {row.grade}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showReport && !isAnalyzing && reportSnapshot ? (
        <Card
          className="border-violet-200 bg-gradient-to-b from-violet-50/90 to-white shadow-md"
          data-testid="team-ai-analysis-lite-report"
        >
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col items-center justify-between gap-4 border-b border-violet-200/70 pb-6 sm:flex-row sm:items-end">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xl font-bold tracking-tight text-amber-700 sm:text-2xl">
                  🏅 AI MVP
                </p>
                <p
                  className="text-2xl font-semibold text-gray-900 sm:text-3xl"
                  data-testid="team-ai-analysis-lite-report-player"
                >
                  {reportPlayerName}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1.5 sm:items-end">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  종합
                </p>
                <LiteReportGradeBadge
                  grade={reportSnapshot.overall}
                  className="px-4 py-1.5 text-lg"
                  data-testid="team-ai-analysis-lite-report-overall"
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-8">
              <TeamAiAnalysisLiteProfileChart snapshot={reportSnapshot} size="large" />

              <ul className="space-y-2">
                {LITE_REPORT_DIMENSION_ROWS.map((d) => (
                  <li
                    key={d.key}
                    className="flex items-center justify-between rounded-lg bg-white/80 px-4 py-3 text-sm shadow-sm ring-1 ring-gray-100"
                  >
                    <span className="font-medium text-gray-700">{d.label}</span>
                    <LiteReportGradeBadge
                      grade={reportSnapshot[d.key]}
                      data-testid={`team-ai-analysis-lite-grade-${d.key}`}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-violet-100 bg-white/90 px-4 py-4 text-sm sm:text-base">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
                AI 코멘트
              </p>
              <p
                className="mt-2 leading-relaxed text-gray-800"
                data-testid="team-ai-analysis-lite-report-comment"
              >
                {reportSnapshot.comment}
              </p>
            </div>

            {reportSnapshot.growthSuggestions.length > 0 ? (
              <div
                className="rounded-lg border border-amber-100 bg-amber-50/90 px-4 py-4 text-sm sm:text-base"
                data-testid="team-ai-analysis-lite-growth-suggestions"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  🎯 성장 제안
                </p>
                <ul className="mt-2 space-y-1.5 text-gray-800">
                  {reportSnapshot.growthSuggestions.map((item) => (
                    <li key={item} className="flex gap-2 leading-relaxed">
                      <span className="text-amber-700" aria-hidden>
                        •
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!embedded && teamId ? (
        <Button variant="outline" className="w-full sm:w-auto" asChild>
          <Link to={teamAiAnalysisLiteTabQuery(teamId)}>팀 홈 탭으로 보기</Link>
        </Button>
      ) : null}

      {embedded ? (
        <p className="text-center text-[11px] text-gray-400">
          탭 ID: <code className="font-mono">{TEAM_AI_ANALYSIS_LITE_TAB}</code>
        </p>
      ) : null}
    </div>
  );
}
