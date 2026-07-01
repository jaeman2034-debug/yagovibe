import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrowthScoreDelta, GrowthScoreResult } from "@/lib/ai-growth/growthScore";
import {
  buildDimensionComparisonRows,
  buildParentComparisonSummary,
  formatGrowthSessionDateLabel,
  findSessionByGeneratedAt,
  type DimensionComparisonRow,
} from "@/lib/ai-growth/growthSessionComparison";
import {
  buildParentDimensionDeltaDisplay,
  formatParentDeltaBadge,
  PARENT_GROWTH_COMPARISON_FOOTNOTE,
  PARENT_GROWTH_DECLINE_SUPPORT,
  PARENT_GROWTH_FIRST_RECORD_BODY,
  PARENT_GROWTH_FIRST_RECORD_TITLE,
} from "@/lib/ai-growth/parentGrowthCopy";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import { GlossaryQuickBar } from "@/components/glossary/GlossaryQuickBar";

export type ParentGrowthHeroCardProps = {
  playerName: string;
  growthScore: GrowthScoreResult | null;
  delta: GrowthScoreDelta | null;
  historySessions: PlayerGrowthSessionDoc[];
  historyLoading: boolean;
};

function DimensionDeltaList({ rows }: { rows: DimensionComparisonRow[] }) {
  const visible = rows
    .map((row) => ({ row, display: buildParentDimensionDeltaDisplay(row) }))
    .filter(
      (item): item is { row: DimensionComparisonRow; display: NonNullable<ReturnType<typeof buildParentDimensionDeltaDisplay>> } =>
        item.display != null
    );
  if (visible.length === 0) return null;

  return (
    <ul className="mt-4 space-y-3 border-t border-emerald-200/80 pt-4">
      <li className="text-xs font-semibold text-emerald-900">항목별 변화</li>
      {visible.map(({ row, display: item }) => (
        <li
          key={row.key}
          className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2.5"
        >
          <p className="text-sm font-semibold text-emerald-950">{item.title}</p>
          <p
            className={cn(
              "mt-0.5 text-sm font-bold tabular-nums",
              (row.delta ?? 0) > 0 && "text-emerald-700",
              (row.delta ?? 0) < 0 && "text-slate-600",
              (row.delta ?? 0) === 0 && "text-gray-600"
            )}
          >
            {item.deltaLine}
          </p>
          {item.explanation ? (
            <p className="mt-1.5 text-xs leading-relaxed text-gray-700">{item.explanation}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Sprint C-1b — Step5 parent hero: growth delta first */
export function ParentGrowthHeroCard({
  playerName,
  growthScore,
  delta,
  historySessions,
  historyLoading,
}: ParentGrowthHeroCardProps) {
  const currentOverall = growthScore?.snapshot.overall ?? null;
  const hasComparison =
    growthScore != null &&
    currentOverall != null &&
    currentOverall > 0 &&
    delta?.previousOverall != null &&
    delta.delta !== null &&
    delta.previousSessionAt != null;

  const previousSession = findSessionByGeneratedAt(
    historySessions,
    delta?.previousSessionAt ?? null
  );
  const dimensionRows = growthScore
    ? buildDimensionComparisonRows(growthScore.snapshot, previousSession?.metrics.growthScore)
    : [];
  const summary = hasComparison ? buildParentComparisonSummary(delta, dimensionRows) : null;
  const deltaBadge =
    hasComparison && delta!.delta !== null ? formatParentDeltaBadge(delta!.delta) : null;

  return (
    <div
      className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50/90 px-4 py-5 shadow-sm sm:px-6 sm:py-6"
      data-testid="parent-growth-hero"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <h4 className="text-lg font-black text-emerald-950 sm:text-xl">학부모 성장 요약</h4>
          <p className="mt-0.5 text-xs text-emerald-800">
            {playerName.trim() || "선수"} · 코치가 확인한 훈련 리포트
          </p>
        </div>
      </div>

      {historyLoading ? (
        <p className="mt-4 text-sm text-emerald-800">성장 기록을 불러오는 중…</p>
      ) : !growthScore || currentOverall == null || currentOverall <= 0 ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-white/90 px-4 py-4 text-sm leading-relaxed text-emerald-950">
          코치가 훈련 장면을 확인·승인하면 성장 점수와 비교가 표시됩니다.
        </p>
      ) : hasComparison ? (
        <>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-4 text-center sm:px-4">
              <p className="text-xs font-semibold text-gray-600">지난 훈련</p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                {formatGrowthSessionDateLabel(delta!.previousSessionAt!)}
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-emerald-950 sm:text-4xl">
                {delta!.previousOverall}
                <span className="text-base font-bold sm:text-lg">점</span>
              </p>
            </div>
            <span className="text-2xl font-bold text-emerald-500" aria-hidden>
              →
            </span>
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-4 text-center sm:px-4">
              <p className="text-xs font-semibold text-gray-600">이번 훈련</p>
              <p className="mt-0.5 text-[10px] text-gray-400">오늘</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-emerald-950 sm:text-4xl">
                {currentOverall}
                <span className="text-base font-bold sm:text-lg">점</span>
              </p>
            </div>
          </div>

          {deltaBadge ? (
            <div className="mt-5 text-center">
              <span
                className={cn(
                  "inline-block rounded-full px-5 py-2 text-lg font-black tabular-nums sm:text-xl",
                  deltaBadge.tone === "up" && "bg-emerald-600 text-white",
                  deltaBadge.tone === "flat" && "bg-gray-100 text-gray-800",
                  deltaBadge.tone === "down" && "bg-slate-100 text-slate-800"
                )}
                data-testid="parent-growth-hero-delta"
              >
                {deltaBadge.label}
              </span>
              {deltaBadge.tone === "down" ? (
                <p className="mt-2 text-sm font-medium text-emerald-900">
                  {PARENT_GROWTH_DECLINE_SUPPORT}
                </p>
              ) : null}
            </div>
          ) : null}

          {summary ? (
            <p className="mt-4 text-center text-sm font-semibold leading-relaxed text-emerald-950 sm:text-base">
              {summary}
            </p>
          ) : null}

          <p className="mt-3 text-center text-[11px] text-emerald-700">
            {PARENT_GROWTH_COMPARISON_FOOTNOTE}
          </p>

          <DimensionDeltaList rows={dimensionRows} />
          <GlossaryQuickBar className="mt-4" />
        </>
      ) : (
        <>
          <div className="mt-5 rounded-xl border border-emerald-200 bg-white px-4 py-5 text-center">
            <p className="text-4xl font-black tabular-nums text-emerald-950 sm:text-5xl">
              {currentOverall}
              <span className="text-xl font-bold sm:text-2xl">점</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-600">이번 훈련</p>
          </div>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-white/90 px-4 py-4 text-center">
            <p className="text-sm font-bold text-emerald-950">{PARENT_GROWTH_FIRST_RECORD_TITLE}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-emerald-900">
              {PARENT_GROWTH_FIRST_RECORD_BODY}
            </p>
          </div>
          <GlossaryQuickBar className="mt-4" />
        </>
      )}
    </div>
  );
}
