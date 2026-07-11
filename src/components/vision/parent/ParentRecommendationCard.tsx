/**
 * Vision v6-6 — Single parent action recommendation
 */

import { Target } from "lucide-react";
import { useParentIntelligenceView } from "@/components/vision/parent/ParentIntelligenceProvider";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";

export function ParentRecommendationCard() {
  const { state, view } = useParentIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;

  return (
    <VisionCardFrame
      title="이번 주 추천"
      testId="parent-intelligence-recommendation"
      loading={loading}
      error={error}
    >
      {view ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3"
          data-testid="parent-intelligence-recommendation-body"
        >
          <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <Target className="h-3.5 w-3.5" aria-hidden />
            한 가지 실천해 보세요
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-emerald-950">
            {view.recommendation}
          </p>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
