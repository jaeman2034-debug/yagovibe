/**
 * RC5-3 — Vision Job Monitor panel (realtime pipeline status)
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useVisionJobMonitor } from "@/hooks/useVisionJobMonitor";
import {
  callProcessVisionUploadQueue,
  callRetryVisionAnalysis,
} from "@/lib/academy/academyVisionCallables";
import {
  formatVisionTimestamp,
  stepIndex,
  VISION_JOB_PIPELINE_STEPS,
} from "@/lib/vision/visionJobMonitorTypes";
import {
  VISION_PIPELINE_STATUS_LABELS,
  VISION_PIPELINE_STEP_LABELS,
  type VisionPipelineStep,
} from "@/lib/vision/visionRunTypes";
import {
  visionMatchDetailPath,
  visionParentReportPath,
  visionTimelinePath,
} from "@/lib/vision/visionPlatformRoutes";
import { teamValidationConsolePath } from "@/lib/team/teamValidationConsoleRoutes";
import { VISION_PILOT_MATCH_ID } from "@/lib/vision/fiiSummaryLoader";

type Props = {
  teamId: string;
  matchId: string;
  variant?: "light" | "dark";
  compact?: boolean;
  playerId?: string;
  className?: string;
};

function StepIcon({
  step,
  current,
  done,
  failed,
}: {
  step: VisionPipelineStep;
  current: boolean;
  done: boolean;
  failed: boolean;
}) {
  if (failed && current) {
    return <AlertCircle className="h-3.5 w-3.5 text-rose-400" aria-hidden />;
  }
  if (done) {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />;
  }
  if (current) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" aria-hidden />;
  }
  return <Circle className="h-3.5 w-3.5 text-violet-500/50" aria-hidden />;
}

export function VisionJobMonitorPanel({
  teamId,
  matchId,
  variant = "dark",
  compact = false,
  playerId,
  className,
}: Props) {
  const job = useVisionJobMonitor(teamId, matchId);
  const [retrying, setRetrying] = useState(false);
  const isDark = variant === "dark";

  const currentIdx = stepIndex(job.pipelineStep);
  const isFailed = job.uiStatus === "failed";
  const isCompleted = job.uiStatus === "completed";
  const isBusy =
    job.uiStatus === "analyzing" ||
    job.uiStatus === "retrying" ||
    job.uiStatus === "queued" ||
    job.uiStatus === "uploading";

  const canRetry = Boolean(job.mediaId) && isFailed && !retrying;

  async function handleRetry() {
    if (!job.mediaId) return;
    setRetrying(true);
    try {
      if (job.queueStatus === "failed" || job.errorCode?.includes("worker")) {
        const result = await callProcessVisionUploadQueue({ teamId, mediaId: job.mediaId });
        if (result.queueStatus === "completed" || result.idempotent) {
          toast.success("Vision 분석이 완료되었습니다.");
        } else {
          toast.error(result.errorMessage ?? "재시도에 실패했습니다.");
        }
        return;
      }
      const result = await callRetryVisionAnalysis({ teamId, mediaId: job.mediaId, matchId });
      if (result.status === "completed" || result.status === "idempotent") {
        toast.success("Vision 분석이 완료되었습니다.");
      } else {
        toast.error(result.errorMessage ?? "재시도에 실패했습니다.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "재시도에 실패했습니다.");
    } finally {
      setRetrying(false);
    }
  }

  if (job.loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
          isDark ? "border-violet-500/30 bg-violet-950/40 text-violet-200" : "border-violet-200 bg-violet-50",
          className
        )}
        data-testid="vision-job-monitor-loading"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Job Monitor 불러오는 중…
      </div>
    );
  }

  if (!job.active) {
    if (compact) return null;
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed px-3 py-3 text-xs",
          isDark ? "border-violet-500/30 text-violet-200" : "border-violet-200 text-violet-800",
          className
        )}
        data-testid="vision-job-monitor-empty"
      >
        <p className="font-semibold">Vision 분석 작업 없음</p>
        <p className="mt-1 opacity-80">
          Validation Console에서 경기 영상을 업로드하면 진행 상태가 여기에 표시됩니다.
        </p>
        <Link
          to={teamValidationConsolePath(teamId, matchId)}
          className="mt-2 inline-block font-bold underline-offset-2 hover:underline"
        >
          MP4 업로드 →
        </Link>
      </div>
    );
  }

  const startedLabel = formatVisionTimestamp(job.startedAt);
  const completedLabel = formatVisionTimestamp(job.completedAt);

  return (
    <section
      className={cn(
        "rounded-xl border",
        isDark ? "border-violet-500/35 bg-violet-950/50" : "border-violet-200 bg-white",
        compact ? "px-3 py-2" : "px-4 py-3",
        className
      )}
      data-testid="vision-job-monitor-panel"
      aria-label="Vision Job Monitor"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide",
              isDark ? "text-violet-300" : "text-violet-700"
            )}
          >
            Job Monitor
          </p>
          <p className={cn("text-xs font-bold", isDark ? "text-white" : "text-violet-950")}>
            {VISION_PIPELINE_STATUS_LABELS[job.uiStatus]}
            {job.pipelineStep ? (
              <span className="ml-1.5 font-normal opacity-80">
                · {VISION_PIPELINE_STEP_LABELS[job.pipelineStep]}
              </span>
            ) : null}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
            isDark ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-900"
          )}
        >
          {job.progress}%
        </span>
      </div>

      <div
        className={cn(
          "mt-2 h-1.5 overflow-hidden rounded-full",
          isDark ? "bg-violet-900" : "bg-violet-100"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isFailed ? "bg-rose-500" : isCompleted ? "bg-emerald-500" : "bg-violet-500"
          )}
          style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
          data-testid="vision-job-monitor-progress-bar"
        />
      </div>

      {!compact ? (
        <ol className="mt-3 space-y-1" data-testid="vision-job-monitor-steps">
          {VISION_JOB_PIPELINE_STEPS.map((step, i) => {
            const done = currentIdx >= 0 && i < currentIdx;
            const current = step === job.pipelineStep;
            const failed = isFailed && current;
            return (
              <li
                key={step}
                className={cn(
                  "flex items-center gap-2 text-[11px]",
                  current ? "font-bold" : "opacity-70",
                  isDark ? "text-violet-100" : "text-violet-900"
                )}
              >
                <StepIcon step={step} current={current} done={done} failed={failed} />
                {VISION_PIPELINE_STEP_LABELS[step]}
              </li>
            );
          })}
        </ol>
      ) : null}

      {(startedLabel || completedLabel || job.retryCount > 0) && !compact ? (
        <dl className="mt-2 space-y-0.5 text-[10px] opacity-80">
          {startedLabel ? (
            <div className="flex gap-2">
              <dt className="shrink-0">시작</dt>
              <dd>{startedLabel}</dd>
            </div>
          ) : null}
          {completedLabel ? (
            <div className="flex gap-2">
              <dt className="shrink-0">완료</dt>
              <dd>{completedLabel}</dd>
            </div>
          ) : null}
          {job.retryCount > 0 ? (
            <div className="flex gap-2">
              <dt className="shrink-0">재시도</dt>
              <dd>{job.retryCount}회</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {job.errorMessage ? (
        <p
          className={cn(
            "mt-2 rounded-lg px-2 py-1.5 text-[11px]",
            isDark ? "bg-rose-950/50 text-rose-200" : "bg-rose-50 text-rose-800"
          )}
          data-testid="vision-job-monitor-error"
        >
          {job.errorCode ? `[${job.errorCode}] ` : ""}
          {job.errorMessage}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canRetry ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-[11px] font-bold"
            disabled={retrying || isBusy}
            data-testid="vision-job-monitor-retry"
            onClick={() => void handleRetry()}
          >
            {retrying ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3 w-3" aria-hidden />
            )}
            재시도
          </Button>
        ) : null}
        {isBusy && !compact ? (
          <span className={cn("text-[10px] font-semibold", isDark ? "text-violet-300" : "text-violet-700")}>
            분석 진행 중… 페이지를 닫아도 Firestore에 상태가 저장됩니다.
          </span>
        ) : null}
      </div>

      {isCompleted ? (
        <div
          className="mt-3 flex flex-wrap gap-3 border-t border-violet-500/20 pt-2"
          data-testid="vision-job-monitor-completion-links"
        >
          <Link
            to={visionMatchDetailPath(teamId, matchId)}
            className={cn(
              "inline-flex items-center min-h-[44px] px-2 text-[11px] font-bold underline-offset-2 hover:underline",
              isDark ? "text-violet-200" : "text-violet-700"
            )}
            data-testid="vision-job-monitor-match-detail-link"
          >
            Match Detail →
          </Link>
          <Link
            to={visionTimelinePath(teamId, matchId)}
            className={cn(
              "inline-flex items-center min-h-[44px] px-2 text-[11px] font-bold underline-offset-2 hover:underline",
              isDark ? "text-cyan-300" : "text-cyan-700"
            )}
            data-testid="vision-job-monitor-timeline-link"
          >
            Timeline →
          </Link>
          {playerId ? (
            <Link
              to={visionParentReportPath(teamId, playerId, matchId)}
              className={cn(
                "inline-flex items-center min-h-[44px] px-2 text-[11px] font-bold underline-offset-2 hover:underline",
                isDark ? "text-emerald-300" : "text-emerald-700"
              )}
              data-testid="vision-job-monitor-parent-report-link"
            >
              Parent Report →
            </Link>
          ) : (
            <Link
              to={visionParentReportPath(teamId, "pilot-player", matchId || VISION_PILOT_MATCH_ID)}
              className={cn(
                "inline-flex items-center min-h-[44px] px-2 text-[11px] font-bold underline-offset-2 hover:underline",
                isDark ? "text-emerald-300" : "text-emerald-700"
              )}
              data-testid="vision-job-monitor-parent-report-link"
            >
              Parent Report →
            </Link>
          )}
        </div>
      ) : null}
    </section>
  );
}
