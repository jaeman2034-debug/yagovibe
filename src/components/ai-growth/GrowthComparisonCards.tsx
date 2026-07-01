import { Download, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GrowthScoreDelta, GrowthScoreResult } from "@/lib/ai-growth/growthScore";
import {
  buildDimensionComparisonRows,
  buildParentComparisonSummary,
  formatGrowthSessionDateLabel,
  findSessionByGeneratedAt,
  type DimensionComparisonRow,
} from "@/lib/ai-growth/growthSessionComparison";
import type { MonthlyGrowthTimeline } from "@/lib/ai-growth/monthlyGrowthTimeline";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";

type LastSessionComparisonCardProps = {
  playerName: string;
  growthScore: GrowthScoreResult | null;
  delta: GrowthScoreDelta | null;
  historySessions: PlayerGrowthSessionDoc[];
  historyLoading: boolean;
};

function DimensionDeltaList({ rows }: { rows: DimensionComparisonRow[] }) {
  const visible = rows.filter((r) => r.delta !== null && r.current !== null);
  if (visible.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1.5 border-t border-teal-100 pt-3">
      {visible.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between text-sm text-gray-800"
        >
          <span>{row.labelKo}</span>
          <span
            className={cn(
              "font-bold tabular-nums",
              (row.delta ?? 0) > 0 && "text-emerald-700",
              (row.delta ?? 0) === 0 && "text-gray-600",
              (row.delta ?? 0) < 0 && "text-slate-600"
            )}
          >
            {(row.delta ?? 0) > 0 ? "+" : ""}
            {row.delta}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** P1-a — 지난 훈련 vs 이번 훈련 */
export function LastSessionComparisonCard({
  playerName,
  growthScore,
  delta,
  historySessions,
  historyLoading,
}: LastSessionComparisonCardProps) {
  const previousSession = findSessionByGeneratedAt(
    historySessions,
    delta?.previousSessionAt ?? null
  );
  const previousSnapshot = previousSession?.metrics.growthScore;
  const dimensionRows = growthScore
    ? buildDimensionComparisonRows(growthScore.snapshot, previousSnapshot)
    : [];
  const summary = growthScore ? buildParentComparisonSummary(delta, dimensionRows) : null;
  const hasComparison =
    growthScore != null &&
    delta?.previousOverall != null &&
    delta.delta !== null &&
    delta.previousSessionAt != null;

  return (
    <div
      className="rounded-xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50/80 px-3 py-3 sm:px-4 sm:py-4"
      data-testid="growth-last-session-comparison"
    >
      <div className="flex items-start gap-2">
        <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
        <div>
          <h4 className="text-base font-bold text-teal-950">지난 훈련 비교</h4>
          <p className="mt-0.5 text-xs text-teal-800">
            {playerName.trim() || "선수"} · 코치가 확인한 훈련 리포트 기준
          </p>
        </div>
      </div>

      {historyLoading ? (
        <p className="mt-3 text-xs text-teal-800">이전 훈련 기록을 불러오는 중…</p>
      ) : !growthScore ? (
        <p className="mt-3 rounded-lg border border-teal-200 bg-white/80 px-3 py-3 text-sm text-teal-900">
          코치가 훈련 장면을 확인·승인하면 항목별 비교가 표시됩니다.
        </p>
      ) : !hasComparison ? (
        <p className="mt-3 rounded-lg border border-teal-200 bg-white/80 px-3 py-3 text-sm text-teal-900">
          비교 가능한 이전 훈련이 없습니다.
        </p>
      ) : (
        <>
          {summary ? (
            <div className="mt-3 rounded-lg border-2 border-teal-300 bg-white px-4 py-4 text-center">
              <p className="whitespace-pre-line text-base font-bold leading-relaxed text-teal-950 sm:text-lg">
                {summary}
              </p>
              <p className="mt-3 text-2xl font-black tabular-nums text-teal-950 sm:text-3xl">
                {delta!.previousOverall}
                <span className="text-lg font-bold">점</span>
                <span className="mx-2 text-teal-600" aria-hidden>
                  →
                </span>
                {growthScore.snapshot.overall}
                <span className="text-lg font-bold">점</span>
              </p>
              {delta!.delta !== null ? (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-sm font-bold text-teal-900">
                    {delta!.delta > 0 ? "+" : ""}
                    {delta!.delta}점 {delta!.delta > 0 ? "향상" : delta!.delta < 0 ? "변화" : ""}
                  </span>
                  {delta!.delta === 0 ? (
                    <span className="text-sm font-semibold text-teal-800">꾸준히 유지 중</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <DimensionDeltaList rows={dimensionRows} />
        </>
      )}
    </div>
  );
}

type GrowthTrendCardProps = {
  timeline: MonthlyGrowthTimeline;
  historyLoading: boolean;
  /** D-4.2-d — 세션 타임라인 ≥2이면 월간 비교 없이도 PDF 허용 */
  canExportTimelinePdf?: boolean;
  monthlyPdfExportPending?: boolean;
  monthlyPdfExportNotice?: string | null;
  onExportMonthlyPdf?: () => void;
};

/** P1-a — 월간 성장 추세 (Hero 비교는 ParentGrowthHeroCard) */
export function GrowthTrendCard({
  timeline,
  historyLoading,
  canExportTimelinePdf = false,
  monthlyPdfExportPending,
  monthlyPdfExportNotice,
  onExportMonthlyPdf,
}: GrowthTrendCardProps) {
  const canExportMonthlyComparison = timeline.hasEnoughData && timeline.points.length >= 2;
  const canExportPdf = canExportTimelinePdf || canExportMonthlyComparison;
  const showTimeline = !historyLoading && timeline.points.length > 0;
  const pdfButtonLabel = canExportMonthlyComparison ? "월간 리포트 PDF" : "성장 추세 PDF";

  return (
    <div
      className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-3 sm:px-4 sm:py-4"
      data-testid="growth-trend-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-bold text-emerald-950">성장 추세</h4>
          <p className="mt-0.5 text-xs text-emerald-800">월별 훈련 기록 · 누적 변화</p>
        </div>
        {onExportMonthlyPdf ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5 border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50"
            disabled={!canExportPdf || monthlyPdfExportPending || historyLoading}
            onClick={onExportMonthlyPdf}
          >
            {monthlyPdfExportPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {monthlyPdfExportPending ? "훈련 리포트 생성 중…" : pdfButtonLabel}
          </Button>
        ) : null}
      </div>

      {historyLoading ? (
        <p className="mt-3 text-xs text-emerald-800">성장 기록을 불러오는 중…</p>
      ) : showTimeline ? (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            {timeline.points.map((p) => (
              <div
                key={p.monthKey}
                className="flex min-w-[72px] flex-col items-center rounded-lg border border-emerald-100 bg-white px-3 py-2"
              >
                <span className="text-[10px] font-medium text-gray-500">{p.label}</span>
                <span className="text-xl font-black tabular-nums text-emerald-950">{p.overall}</span>
                <span className="text-[10px] text-gray-400">점</span>
              </div>
            ))}
            {timeline.hasEnoughData && timeline.spanDelta !== null ? (
              <div className="rounded-lg border border-emerald-300 bg-emerald-100/80 px-3 py-2">
                <p className="text-[10px] font-semibold text-emerald-800">누적 성장</p>
                <p className="text-lg font-black tabular-nums text-emerald-950">
                  {timeline.spanDelta > 0 ? "+" : ""}
                  {timeline.spanDelta}
                </p>
              </div>
            ) : null}
          </div>
          {timeline.parentNarrative ? (
            <p className="mt-2 text-sm font-medium text-emerald-900">{timeline.parentNarrative}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-white/80 px-3 py-3 text-xs text-emerald-800">
          훈련 세션을 저장하면 월별 성장 추세가 쌓입니다.
        </p>
      )}

      {monthlyPdfExportNotice ? (
        <p
          className={cn(
            "mt-2 text-xs",
            monthlyPdfExportNotice.includes("실패") || monthlyPdfExportNotice.includes("필요")
              ? "text-red-700"
              : "text-emerald-800"
          )}
        >
          {monthlyPdfExportNotice}
        </p>
      ) : null}

      {!historyLoading && !canExportPdf ? (
        <p className="mt-2 text-[11px] text-emerald-700">
          성장 리포트 PDF는 코치 검증 훈련 기록 2회 이상 필요합니다.
        </p>
      ) : null}
      {!historyLoading && canExportPdf && !canExportMonthlyComparison ? (
        <p className="mt-2 text-[11px] text-emerald-700">
          월간 비교 차트는 서로 다른 달에 저장된 훈련 2회 이상일 때 표시됩니다. 최근 5회 추세는 PDF에
          포함됩니다.
        </p>
      ) : null}
    </div>
  );
}
