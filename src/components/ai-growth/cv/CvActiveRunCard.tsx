/**
 * CV-1 I6-2 — Active run (cvActiveRunId)
 */
import { Zap } from "lucide-react";
import type { AcademyCvRunSnapshot } from "@/lib/academy/academyCvRead";
import {
  formatCvMetric,
  formatCvProcessedAt,
} from "@/components/ai-growth/cv/cvRunUiHelpers";
import { CvReviewStatusBadge } from "@/components/ai-growth/cv/CvReviewStatusBadge";

type Props = {
  activeRun: AcademyCvRunSnapshot;
  cvActiveRunId?: string;
};

export function CvActiveRunCard({ activeRun, cvActiveRunId }: Props) {
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-xs text-gray-900">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-900">
        <Zap className="h-3.5 w-3.5" />
        Current Active Run
      </p>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        <p>
          Run ID: <strong className="font-mono">{(cvActiveRunId ?? activeRun.runId).slice(0, 12)}…</strong>
        </p>
        <p>
          ROI v<strong>{activeRun.roiVersion}</strong>
        </p>
        <p>
          Visibility: <strong>{formatCvMetric(activeRun.visibilityRatio)}</strong>
        </p>
        <p>
          Confidence: <strong>{formatCvMetric(activeRun.sessionConfidence)}</strong>
        </p>
        <p className="sm:col-span-2">
          Processed: <strong>{formatCvProcessedAt(activeRun.processedAt)}</strong>
        </p>
      </div>
      <div className="mt-2">
        <CvReviewStatusBadge status={activeRun.reviewStatus} />
      </div>
    </div>
  );
}
