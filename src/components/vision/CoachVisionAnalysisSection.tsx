/**
 * Vision v6-4 / v6-7 — Coach Dashboard section with pipeline status + run control
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCoachVisionAccess } from "@/hooks/useCoachVisionAccess";
import { useMatchVisionPipelineStatus } from "@/hooks/useMatchVisionPipelineStatus";
import {
  callProcessVisionUploadQueue,
  callRetryVisionAnalysis,
  callStartVisionAnalysis,
} from "@/lib/academy/academyVisionCallables";
import { useVisionUploadQueueStatus } from "@/hooks/useVisionUploadQueueStatus";
import {
  VisionCoachDashboardProvider,
  useVisionCoachDashboard,
  type VisionCoachSurfaceVariant,
} from "@/components/vision/VisionCoachDashboardProvider";
import { VisionSummaryCard } from "@/components/vision/VisionSummaryCard";
import { VisionFiiRankingTable } from "@/components/vision/VisionFiiRankingTable";
import { VisionPlaymakerCard } from "@/components/vision/VisionPlaymakerCard";
import { VisionBallProgressionCard } from "@/components/vision/VisionBallProgressionCard";
import { VisionPressureZoneCard } from "@/components/vision/VisionPressureZoneCard";
import { VisionCompactnessCard } from "@/components/vision/VisionCompactnessCard";
import { VisionTacticalReportCard } from "@/components/vision/VisionTacticalReportCard";
import { VisionPipelineStatusBadge } from "@/components/vision/VisionPipelineStatusBadge";
import {
  VisionTeamFiiCard,
  VisionMatchSummaryCard,
  VisionCoachDecisionBriefCard,
  VisionCoachInsightCard,
} from "@/components/vision/VisionCoachInsightCards";
import { CoachMatchFlowTrendCard } from "@/components/vision/CoachMatchFlowTrendCard";
import { teamValidationConsolePath } from "@/lib/team/teamValidationConsoleRoutes";
import { VisionPlatformNav } from "@/components/vision/VisionPlatformNav";
import { VisionJobMonitorPanel } from "@/components/vision/VisionJobMonitorPanel";

export type CoachVisionAnalysisSectionProps = {
  teamId: string;
  matchId: string;
  authUid?: string | null;
  /** members/{docId} legacy row role — access hook 보조 */
  memberRole?: string | null;
  variant?: VisionCoachSurfaceVariant;
  className?: string;
};

function VisionRunControl({
  teamId,
  matchId,
  variant,
}: {
  teamId: string;
  matchId: string;
  variant: VisionCoachSurfaceVariant;
}) {
  const pipeline = useMatchVisionPipelineStatus(teamId, matchId);
  const queue = useVisionUploadQueueStatus(teamId, pipeline.index?.mediaId ?? undefined);
  const [running, setRunning] = useState(false);

  const mediaId = pipeline.index?.mediaId;
  const queueBusy =
    queue.doc?.status === "uploaded" ||
    queue.doc?.status === "queued" ||
    queue.doc?.status === "processing";
  const canStart =
    Boolean(mediaId) &&
    !queueBusy &&
    (pipeline.uiStatus === "queued" ||
      pipeline.uiStatus === "failed" ||
      pipeline.uiStatus === "none");
  const isBusy =
    pipeline.uiStatus === "uploading" ||
    pipeline.uiStatus === "analyzing" ||
    pipeline.uiStatus === "retrying" ||
    queueBusy;
  const needsUpload = !mediaId && pipeline.uiStatus === "none";

  async function handleRun() {
    if (!mediaId) {
      toast.message("먼저 Validation Console에서 이 경기(matchId)로 영상을 업로드해 주세요.");
      return;
    }
    setRunning(true);
    try {
      if (queue.doc?.status === "failed" || pipeline.uiStatus === "failed") {
        const queueResult = await callProcessVisionUploadQueue({ teamId, mediaId });
        if (queueResult.queueStatus === "completed" || queueResult.idempotent) {
          toast.success("Vision 분석이 완료되었습니다.");
        } else {
          toast.error(queueResult.errorMessage ?? "Vision 분석에 실패했습니다.");
        }
        return;
      }

      const fn =
        pipeline.uiStatus === "failed"
          ? callRetryVisionAnalysis
          : callStartVisionAnalysis;
      const result = await fn({
        teamId,
        mediaId,
        matchId,
        startedFrom: pipeline.uiStatus === "failed" ? "retry" : "manual",
      });
      if (result.status === "completed" || result.status === "idempotent") {
        toast.success("Vision 분석이 완료되었습니다.");
      } else {
        toast.error(result.errorMessage ?? "Vision 분석에 실패했습니다.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Vision 분석 시작에 실패했습니다.";
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <VisionPipelineStatusBadge
        status={pipeline.uiStatus}
        pipelineStep={pipeline.index?.pipelineStep}
        progress={pipeline.index?.progress}
        variant={variant}
      />
      {needsUpload ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs font-bold"
          asChild
        >
          <Link to={teamValidationConsolePath(teamId, matchId)} data-testid="vision-upload-mp4-link">
            <Upload className="h-3.5 w-3.5" aria-hidden />
            MP4 업로드 (Validation Console)
          </Link>
        </Button>
      ) : null}
      {canStart ? (
        <Button
          type="button"
          size="sm"
          disabled={running || isBusy}
          className={cn(
            "gap-1.5 text-xs font-bold",
            variant === "dark"
              ? "bg-violet-600 hover:bg-violet-500"
              : "bg-violet-700 hover:bg-violet-600"
          )}
          data-testid="vision-run-analysis-button"
          onClick={() => void handleRun()}
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          )}
          {pipeline.uiStatus === "failed" || queue.doc?.status === "failed"
            ? "Vision 분석 재시도"
            : "Vision 분석 실행"}
        </Button>
      ) : null}
      {queueBusy && !running ? (
        <span className="text-[10px] font-semibold opacity-80">자동 분석 진행 중…</span>
      ) : null}
    </div>
  );
}

function CoachVisionDashboardGrid({ teamId, matchId }: { teamId: string; matchId: string }) {
  const { cardState, error, variant } = useVisionCoachDashboard();
  const pipeline = useMatchVisionPipelineStatus(teamId, matchId);

  if (cardState === "empty" && pipeline.uiStatus !== "completed") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed px-4 py-6 text-center",
          variant === "dark"
            ? "border-violet-500/35 bg-violet-950/30 text-violet-100"
            : "border-violet-200 bg-violet-50/50 text-violet-950"
        )}
        data-testid="vision-coach-empty-state"
      >
        <p className="text-sm font-semibold">아직 Vision 분석 결과가 없습니다.</p>
        <p className="mt-1 text-xs opacity-80">
          Validation Console에서 경기 영상(MP4)을 업로드한 뒤 Vision 분석을 실행하면 FII·전술 리포트가 표시됩니다.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <VisionRunControl teamId={teamId} matchId={matchId} variant={variant} />
          {!pipeline.index?.mediaId ? (
            <Link
              to={teamValidationConsolePath(teamId, matchId)}
              className={cn(
                "text-xs font-bold underline-offset-2 hover:underline",
                variant === "dark" ? "text-violet-200" : "text-violet-800"
              )}
              data-testid="vision-empty-upload-link"
            >
              Validation Console 열기 →
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (cardState === "error") {
    return (
      <div
        className={cn(
          "rounded-2xl border px-4 py-4",
          variant === "dark"
            ? "border-rose-500/40 bg-rose-950/30 text-rose-100"
            : "border-rose-200 bg-rose-50 text-rose-900"
        )}
        data-testid="vision-coach-section-error"
      >
        <p className="text-sm font-semibold">Vision 분석을 불러오지 못했습니다.</p>
        <p className="mt-1 text-xs opacity-90">{error ?? "잠시 후 다시 시도해 주세요."}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2" data-testid="vision-coach-dashboard-grid">
      <div className="space-y-3 lg:col-span-2">
        <VisionCoachDecisionBriefCard />
        <VisionMatchSummaryCard />
      </div>
      <VisionTeamFiiCard />
      <VisionSummaryCard />
      <div className="lg:col-span-2">
        <CoachMatchFlowTrendCard />
      </div>
      <div className="lg:col-span-2">
        <VisionCoachInsightCard />
      </div>
      <div className="lg:col-span-2">
        <VisionFiiRankingTable teamId={teamId} matchId={matchId} />
      </div>
      <VisionPlaymakerCard />
      <VisionBallProgressionCard />
      <VisionPressureZoneCard />
      <VisionCompactnessCard />
      <div className="lg:col-span-2">
        <VisionTacticalReportCard />
      </div>
      <div className="lg:col-span-2 flex justify-end">
        <Link
          to={`/teams/${encodeURIComponent(teamId)}/vision/match/${encodeURIComponent(matchId)}`}
          className={cn(
            "text-xs font-bold underline-offset-2 hover:underline",
            variant === "dark" ? "text-violet-200" : "text-violet-800"
          )}
          data-testid="vision-match-detail-link"
        >
          Match Detail 전체 보기 →
        </Link>
      </div>
    </div>
  );
}

function CoachVisionMatchPickPrompt({
  teamId,
  variant = "light",
  className,
}: {
  teamId: string;
  variant?: VisionCoachSurfaceVariant;
  className?: string;
}) {
  return (
    <section
      className={cn("space-y-3", className)}
      data-testid="coach-vision-analysis-section"
      aria-label="Vision Coach Dashboard"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide",
              variant === "dark" ? "text-violet-300" : "text-violet-700"
            )}
          >
            Vision Coach
          </p>
          <h3
            className={cn(
              "text-sm font-black",
              variant === "dark" ? "text-white" : "text-violet-950"
            )}
          >
            경기 영상 분석
          </h3>
        </div>
        <VisionPipelineStatusBadge status="none" variant={variant} />
      </div>
      <div
        className={cn(
          "rounded-2xl border border-dashed px-4 py-5 text-center",
          variant === "dark"
            ? "border-violet-500/35 bg-violet-950/30 text-violet-100"
            : "border-violet-200 bg-violet-50/50 text-violet-950"
        )}
        data-testid="vision-coach-pick-match"
      >
        <p className="text-sm font-semibold">종료 경기를 선택해 주세요</p>
        <p className="mt-1 text-xs opacity-80">
          위에서 종료 경기를 고르거나, 경기 결과를 입력한 뒤 Vision 분석을 실행할 수 있습니다.
        </p>
        <Link
          to={`/teams/${encodeURIComponent(teamId)}/games`}
          className={cn(
            "mt-3 inline-flex text-xs font-bold underline-offset-2 hover:underline",
            variant === "dark" ? "text-violet-200" : "text-violet-800"
          )}
        >
          경기 기록으로 이동
        </Link>
      </div>
    </section>
  );
}

function CoachVisionAnalysisSectionInner({
  teamId,
  matchId,
  variant = "light",
  className,
}: Omit<CoachVisionAnalysisSectionProps, "authUid">) {
  return (
    <VisionCoachDashboardProvider teamId={teamId} matchId={matchId} variant={variant}>
      <section
        className={cn("space-y-3", className)}
        data-testid="coach-vision-analysis-section"
        aria-label="Vision Coach Dashboard"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-wide",
                variant === "dark" ? "text-violet-300" : "text-violet-700"
              )}
            >
              Vision Coach
            </p>
            <h3
              className={cn(
                "text-sm font-black",
                variant === "dark" ? "text-white" : "text-violet-950"
              )}
            >
              경기 영상 분석
            </h3>
          </div>
          <VisionRunControl teamId={teamId} matchId={matchId} variant={variant} />
        </div>
        <VisionPlatformNav
          teamId={teamId}
          matchId={matchId}
          current="coach"
          variant={variant}
          compact
        />
        <VisionJobMonitorPanel teamId={teamId} matchId={matchId} variant={variant} />
        <CoachVisionDashboardGrid teamId={teamId} matchId={matchId} />
      </section>
    </VisionCoachDashboardProvider>
  );
}

export function CoachVisionAnalysisSection({
  teamId,
  matchId,
  authUid,
  memberRole,
  variant = "light",
  className,
}: CoachVisionAnalysisSectionProps) {
  const trimmedMatchId = matchId?.trim() ?? "";
  const { canView, loading: accessLoading } = useCoachVisionAccess(teamId, authUid, memberRole);

  if (accessLoading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed px-4 py-3 text-xs",
          variant === "dark"
            ? "border-violet-500/35 text-violet-200"
            : "border-violet-200 text-violet-800"
        )}
        data-testid="vision-coach-access-loading"
      >
        Vision 권한 확인 중…
      </div>
    );
  }
  if (!canView) return null;

  if (!trimmedMatchId) {
    return (
      <CoachVisionMatchPickPrompt teamId={teamId} variant={variant} className={className} />
    );
  }

  return (
    <CoachVisionAnalysisSectionInner
      teamId={teamId}
      matchId={trimmedMatchId}
      variant={variant}
      className={className}
    />
  );
}

export default CoachVisionAnalysisSection;
