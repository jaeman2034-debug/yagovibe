/**
 * J1-3a — Parent Home Monthly PDF card (read-only · client export)
 */
import { useEffect, useState } from "react";
import { FileDown, FileText, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logJ0ParentCriticalPath } from "@/lib/ai-growth/j0ParentCriticalPathLog";
import {
  buildParentMonthlyPdfView,
  PARENT_MONTHLY_PDF_EXPORT_BLOCKED_MESSAGE,
} from "@/lib/ai-growth/parentMonthlyPdfView";
import { exportParentMonthlyGrowthPdf } from "@/lib/ai-growth/parentMonthlyPdfExport";
import type {
  ParentHomeGrowthSummarySlice,
  ParentHomeWeeklyDigestSlice,
} from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import { cn } from "@/lib/utils";

type Props = {
  teamId: string;
  playerId: string;
  playerName: string;
  teamName: string;
  avatar: PlayerGrowthAvatarDoc;
  growthSummary: ParentHomeGrowthSummarySlice;
  timeline: PlayerGrowthTimeline | null;
  weeklyDigest: ParentHomeWeeklyDigestSlice | null;
  className?: string;
};

export function ParentMonthlyGrowthPdfPanel({
  teamId,
  playerId,
  playerName,
  teamName,
  avatar,
  growthSummary,
  timeline,
  weeklyDigest,
  className,
}: Props) {
  const [exportPending, setExportPending] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const view = buildParentMonthlyPdfView({
    playerName,
    avatar,
    growthSummary,
    timeline,
    weeklyDigest,
  });

  useEffect(() => {
    logJ0ParentCriticalPath(
      "monthly_pdf_render",
      view.isEmpty ? "empty" : "success",
      { teamId, playerId, periodLabel: view.periodLabel },
      view.isEmpty ? { emptyMessage: view.emptyMessage } : undefined
    );
  }, [teamId, playerId, view.isEmpty, view.periodLabel, view.emptyMessage]);

  async function handleExportPdf() {
    if (!view.canExport || exportPending) return;

    setExportPending(true);
    setExportNotice(null);
    logJ0ParentCriticalPath("monthly_pdf_export", "start", { teamId, playerId });

    try {
      const filename = await exportParentMonthlyGrowthPdf({
        teamId,
        playerId,
        playerName,
        teamName,
        avatar,
        timeline,
      });
      setExportNotice(`PDF 다운로드 완료: ${filename}`);
      logJ0ParentCriticalPath("monthly_pdf_export", "success", { teamId, playerId }, { filename });
    } catch (error) {
      const message = error instanceof Error ? error.message : "월간 PDF 생성 실패";
      setExportNotice(message);
      logJ0ParentCriticalPath("monthly_pdf_export", "error", { teamId, playerId }, { error: message });
    } finally {
      setExportPending(false);
    }
  }

  if (view.isEmpty) {
    return (
      <section
        className={cn(
          "mt-3 rounded-2xl border border-dashed border-emerald-300 bg-gradient-to-b from-emerald-50/70 to-white p-4",
          className
        )}
        data-testid="j13-monthly-pdf-empty"
        aria-label="월간 성장 리포트"
      >
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden />
          <div>
            <h2 className="text-base font-bold text-emerald-950">월간 성장 리포트</h2>
            <p className="mt-2 text-sm leading-relaxed text-emerald-900">{view.emptyMessage}</p>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-emerald-700">read-only · 코치 승인 데이터 기반</p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "mt-3 rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50/90 p-4 shadow-sm",
        className
      )}
      data-testid="j13-monthly-pdf-panel"
      aria-label="월간 성장 리포트"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-black text-emerald-950">
            <FileText className="h-4 w-4 text-emerald-700" aria-hidden />
            월간 성장 리포트
          </h2>
          <p className="mt-0.5 text-[10px] text-emerald-700">{view.periodLabel}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="border-emerald-400 bg-white text-emerald-950 hover:bg-emerald-50"
          disabled={!view.canExport || exportPending}
          onClick={() => void handleExportPdf()}
          data-testid="j13-monthly-pdf-export-btn"
        >
          {exportPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <FileDown className="mr-1 h-3.5 w-3.5" aria-hidden />
          )}
          {exportPending ? "PDF 생성 중…" : "PDF 다운로드"}
        </Button>
      </div>

      {view.summaryLine ? (
        <p className="mt-3 text-sm font-medium text-emerald-900" data-testid="j13-monthly-pdf-summary">
          {view.summaryLine}
        </p>
      ) : null}

      {view.ovrLine ? (
        <p
          className="mt-2 text-lg font-black tabular-nums text-emerald-950"
          data-testid="j13-monthly-pdf-ovr"
        >
          <TrendingUp className="mr-1 inline h-4 w-4 text-emerald-600" aria-hidden />
          {view.ovrLine}
        </p>
      ) : null}

      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-emerald-950">
        {view.avatarLine ? (
          <li data-testid="j13-monthly-pdf-avatar">{view.avatarLine}</li>
        ) : null}
        {view.trendLine ? (
          <li data-testid="j13-monthly-pdf-trend">{view.trendLine}</li>
        ) : null}
        {view.strengthLine ? (
          <li data-testid="j13-monthly-pdf-strength">{view.strengthLine}</li>
        ) : null}
        {view.nextGoalLine ? (
          <li className="font-medium text-teal-900" data-testid="j13-monthly-pdf-next-goal">
            {view.nextGoalLine}
          </li>
        ) : null}
      </ul>

      {exportNotice ? (
        <p
          className={cn(
            "mt-3 rounded-lg px-2.5 py-1.5 text-xs",
            exportNotice.includes("실패") || exportNotice.includes("필요")
              ? "bg-amber-50 text-amber-950"
              : "bg-emerald-100 text-emerald-950"
          )}
          data-testid="j13-monthly-pdf-export-notice"
        >
          {exportNotice}
        </p>
      ) : null}

      {!view.canExport ? (
        <p className="mt-2 text-[11px] text-emerald-800">{PARENT_MONTHLY_PDF_EXPORT_BLOCKED_MESSAGE}</p>
      ) : null}

      <p className="mt-3 text-[10px] text-emerald-700">read-only · 코치 승인 데이터 기반</p>
    </section>
  );
}
