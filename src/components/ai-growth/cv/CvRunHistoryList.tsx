/**
 * CV-1 I6-1 — cvRuns history list (read-only)
 */
import { History } from "lucide-react";
import type { AcademyCvRunSnapshot } from "@/lib/academy/academyCvRead";
import { formatCvProcessedAt } from "@/components/ai-growth/cv/cvRunUiHelpers";
import { CvReviewStatusBadge } from "@/components/ai-growth/cv/CvReviewStatusBadge";
import { cn } from "@/lib/utils";

type Props = {
  runs: AcademyCvRunSnapshot[];
  activeRunId?: string;
};

export function CvRunHistoryList({ runs, activeRunId }: Props) {
  if (runs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-3 py-4 text-center text-xs text-gray-500">
        CV run 이력이 없습니다. ROI 분석을 실행하면 cvRuns가 생성됩니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
        <History className="h-3.5 w-3.5" />
        CV Run History ({runs.length})
      </p>
      <ul className="max-h-48 space-y-1.5 overflow-y-auto">
        {runs.map((run) => {
          const isActive = activeRunId === run.runId;
          return (
            <li
              key={run.runId}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                isActive
                  ? "border-indigo-300 bg-indigo-50/60"
                  : "border-slate-200 bg-white/80"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-gray-800">
                  {run.runId.slice(0, 10)}…
                  {isActive ? (
                    <span className="ml-1.5 rounded bg-indigo-200 px-1 py-0.5 text-[9px] font-bold uppercase text-indigo-950">
                      active
                    </span>
                  ) : null}
                </span>
                <CvReviewStatusBadge status={run.reviewStatus} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
                <span>
                  ROI v<strong>{run.roiVersion}</strong>
                </span>
                <span>{formatCvProcessedAt(run.processedAt)}</span>
                <span>{run.analysisStatus}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
