/**
 * Vision v6-6 — Parent Intelligence summary + emotion
 */

import { Heart, MessageSquareText } from "lucide-react";
import { useParentIntelligenceView } from "@/components/vision/parent/ParentIntelligenceProvider";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";

export function ParentIntelligenceSummaryCard() {
  const { state, view } = useParentIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;

  return (
    <VisionCardFrame
      title="경기 성장 요약"
      testId="parent-intelligence-summary"
      loading={loading}
      error={error}
    >
      {view ? (
        <div className="space-y-3">
          {view.summary.matchLabel ? (
            <p className="text-xs font-semibold text-violet-700">{view.summary.matchLabel}</p>
          ) : null}
          <p className="text-sm leading-relaxed text-violet-950">{view.narrativeSummary}</p>
          <div
            className="rounded-xl border border-rose-200/80 bg-rose-50/60 px-3 py-2.5"
            data-testid="parent-intelligence-emotion"
          >
            <p className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
              <Heart className="h-3.5 w-3.5" aria-hidden />
              코치 한마디
            </p>
            <p className="mt-1 text-sm leading-relaxed text-rose-950">{view.emotionSummary}</p>
          </div>
          {view.matchSummary && view.hasVisionAnalysis ? (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-violet-800/90">
              <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden />
              {view.matchSummary}
            </p>
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
