/**
 * RC4-4 M4 — Parent Report insight cards (fii_summary parentInsights)
 */

import { Heart, Sparkles, Target, Trophy } from "lucide-react";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useParentIntelligenceView } from "@/components/vision/parent/ParentIntelligenceProvider";

export function ParentSessionSummaryCard() {
  const { state, view } = useParentIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const text = view?.sessionSummary ?? view?.matchSummary;

  return (
    <VisionCardFrame
      title="경기 요약"
      testId="parent-session-summary-card"
      loading={loading}
      error={error}
      empty={state.status === "ready" && !text}
      emptyMessage="경기 요약이 아직 없습니다."
    >
      {view && text ? (
        <div className="space-y-2">
          {view.summary.matchLabel ? (
            <p className="text-sm font-black text-indigo-950">{view.summary.matchLabel}</p>
          ) : null}
          <p className="text-sm leading-relaxed text-indigo-900">{text}</p>
          {view.teamFiiScore != null ? (
            <p className="text-xs text-indigo-700">
              팀 경기 지표 FII <strong className="tabular-nums">{view.teamFiiScore}</strong>
            </p>
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

export function ParentGrowthHighlightCard() {
  const { state, view } = useParentIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;

  return (
    <VisionCardFrame
      title="성장 하이라이트"
      testId="parent-growth-highlight-card"
      loading={loading}
      error={error}
      empty={state.status === "ready" && !view?.growthHighlight}
      emptyMessage="성장 하이라이트가 아직 없습니다."
    >
      {view?.growthHighlight ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm font-semibold leading-relaxed text-amber-950">
            {view.growthHighlight}
          </p>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

export function ParentEncouragementCard() {
  const { state, view } = useParentIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const text = view?.encouragement ?? view?.emotionSummary;

  return (
    <VisionCardFrame
      title="응원 메시지"
      testId="parent-encouragement-card"
      loading={loading}
      error={error}
      empty={state.status === "ready" && !text}
      emptyMessage="응원 메시지가 아직 없습니다."
    >
      {view && text ? (
        <div className="flex gap-3 rounded-xl border border-pink-200 bg-pink-50/70 px-3 py-3">
          <Heart className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" aria-hidden />
          <p className="text-sm font-medium leading-relaxed text-pink-950">{text}</p>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

export function ParentNextTrainingCard() {
  const { state, view } = useParentIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const text = view?.nextTraining ?? view?.recommendation;

  return (
    <VisionCardFrame
      title="다음 훈련 제안"
      testId="parent-next-training-card"
      loading={loading}
      error={error}
      empty={state.status === "ready" && !text}
      emptyMessage="훈련 제안이 아직 없습니다."
    >
      {view && text ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <Target className="h-3.5 w-3.5" aria-hidden />
            집에서 함께 해볼 수 있어요
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-emerald-950">{text}</p>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

export function ParentTeamFiiBadge() {
  const { view } = useParentIntelligenceView();
  if (view?.teamFiiScore == null) return null;
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white"
      data-testid="parent-team-fii-badge"
    >
      <Trophy className="h-3.5 w-3.5" aria-hidden />
      팀 FII {view.teamFiiScore}
    </div>
  );
}

export function ParentFiiSourceBadge() {
  const { isFiiSummarySource } = useParentIntelligenceView();
  if (!isFiiSummarySource) return null;
  return (
    <span className="text-[10px] font-medium text-indigo-600" data-testid="parent-fii-source-badge">
      Vision RC4 · fii_summary
    </span>
  );
}
