/**
 * CV-1 I6-3 — Active vs previous run metric delta
 */
import { GitCompare } from "lucide-react";
import type { AcademyCvRunSnapshot } from "@/lib/academy/academyCvRead";
import { formatCvDelta } from "@/components/ai-growth/cv/cvRunUiHelpers";

type Props = {
  activeRun: AcademyCvRunSnapshot;
  previousRun: AcademyCvRunSnapshot;
};

export function CvRunCompareCard({ activeRun, previousRun }: Props) {
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/40 px-3 py-2 text-xs text-gray-900">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-900">
        <GitCompare className="h-3.5 w-3.5" />
        Run Compare
      </p>
      <p className="mt-1 text-[10px] text-teal-800">
        ROI v{previousRun.roiVersion} → v{activeRun.roiVersion} (active vs previous)
      </p>
      <div className="mt-2 space-y-1">
        <p>
          Visibility Ratio Δ:{" "}
          <strong>{formatCvDelta(previousRun.visibilityRatio, activeRun.visibilityRatio)}</strong>
        </p>
        <p>
          Session Confidence Δ:{" "}
          <strong>{formatCvDelta(previousRun.sessionConfidence, activeRun.sessionConfidence)}</strong>
        </p>
      </div>
    </div>
  );
}
