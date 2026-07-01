import { cn } from "@/lib/utils";
import { computeFiiV1FromGrowthScore } from "@/lib/fii/fiiEngineV1";
import type { GrowthScoreResult } from "@/lib/ai-growth/growthScore";
import {
  recommendTrainingV1,
  type TrainingRecommendation,
} from "@/lib/tacticalAgent/recommendTrainingV1";
import { mapRecommendationsForParent } from "@/lib/ai-growth/parentTrainingLanguage";

type Props = {
  growthScore: GrowthScoreResult;
  className?: string;
  /** Sprint D-2b — parent view uses plain-language titles */
  audience?: "coach" | "parent";
};

const PRIORITY_STYLE: Record<TrainingRecommendation["priority"], string> = {
  A: "bg-rose-100 text-rose-800 border-rose-200",
  B: "bg-amber-100 text-amber-800 border-amber-200",
  C: "bg-sky-100 text-sky-800 border-sky-200",
};

export function TacticalTrainingRecommendationCard({
  growthScore,
  className,
  audience = "coach",
}: Props) {
  const fii = computeFiiV1FromGrowthScore(growthScore);
  const raw = recommendTrainingV1(fii);
  const recommendations =
    audience === "parent" ? mapRecommendationsForParent(raw) : raw;
  const isParent = audience === "parent";

  if (!recommendations.length) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50/80 px-4 py-4",
        className
      )}
      data-testid="tactical-training-recommendation-card"
      data-audience={audience}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
        {isParent ? "다음 연습 추천" : "AI 훈련 추천"}
      </p>
      <p className="mt-1 text-sm text-violet-900">
        {isParent
          ? "코치가 확인한 성장 데이터 기준 · 이번 주 연습 우선순위"
          : "FII 약점 축 기반 — 코치가 세션에 반영할 다음 훈련 제안"}
      </p>

      <ul className="mt-3 space-y-2">
        {recommendations.map((rec) => (
          <li
            key={`${rec.axis}-${rec.title}`}
            className="rounded-lg border border-violet-100 bg-white/90 px-3 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              {!isParent ? (
                <>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] font-bold",
                      PRIORITY_STYLE[rec.priority]
                    )}
                  >
                    우선도 {rec.priority}
                  </span>
                  <span className="text-xs font-semibold text-violet-800">{rec.axisLabelKo}</span>
                  <span className="text-[10px] text-gray-500">{rec.durationMinutes}분</span>
                </>
              ) : (
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px] font-bold",
                    PRIORITY_STYLE[rec.priority]
                  )}
                >
                  우선도 {rec.priority}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-bold text-gray-900">{rec.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{rec.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
