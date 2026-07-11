/**
 * Vision v6-4 — lazy boundary for PlayTab mount (keeps PlayTab diff minimal)
 */

import { lazy, Suspense } from "react";
import type { CoachVisionAnalysisSectionProps } from "@/components/vision/CoachVisionAnalysisSection";

const CoachVisionAnalysisSection = lazy(() =>
  import("@/components/vision/CoachVisionAnalysisSection").then((m) => ({
    default: m.CoachVisionAnalysisSection,
  }))
);

export type PlayTabVisionMountProps = CoachVisionAnalysisSectionProps & {
  /** false면 마운트하지 않음 (비코치 등) */
  enabled?: boolean;
};

export function PlayTabVisionMount({
  enabled = true,
  ...props
}: PlayTabVisionMountProps) {
  if (!enabled || !props.teamId?.trim()) return null;
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-dashed border-violet-300/40 px-4 py-3 text-xs text-violet-200">
          Vision 로딩…
        </div>
      }
    >
      <CoachVisionAnalysisSection {...props} />
    </Suspense>
  );
}
