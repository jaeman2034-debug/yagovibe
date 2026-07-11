/**
 * Vision v6-6 — Explainable FII highlights for parents (non-fii_summary path)
 */

import { Lightbulb } from "lucide-react";
import { useParentIntelligenceView } from "@/components/vision/parent/ParentIntelligenceProvider";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";

export function ParentExplainableFiiCard() {
  const { state, view } = useParentIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const explainable = view?.explainable;
  const bullets = explainable?.bullets?.filter(Boolean) ?? [];

  return (
    <VisionCardFrame
      title={explainable?.title ?? "경기에서 잘한 점"}
      testId="parent-explainable-fii-card"
      loading={loading}
      error={error}
      empty={state.status === "ready" && bullets.length === 0}
      emptyMessage="경기 분석 하이라이트가 아직 없습니다."
    >
      {view && bullets.length > 0 ? (
        <div className="space-y-2" data-testid="parent-explainable-fii-body">
          <p className="flex items-center gap-1.5 text-xs font-bold text-violet-800">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" aria-hidden />
            쉽게 설명한 경기 포인트
          </p>
          <ul className="list-inside list-disc space-y-1.5 text-sm leading-relaxed text-violet-950">
            {bullets.map((line, i) => (
              <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
