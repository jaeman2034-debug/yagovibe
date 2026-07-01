import { Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useHubLinkedChildGrowthSummary,
  type HubGrowthSummaryEmptyReason,
} from "@/hooks/useHubLinkedChildGrowthSummary";
import { useParentLatestDeliveredReport } from "@/hooks/useParentLatestDeliveredReport";
import { buildGrowthReportSharePath } from "@/lib/ai-growth/growthReportDelivery";
import {
  formatParentDeltaBadge,
  PARENT_GROWTH_COMPARISON_FOOTNOTE,
  PARENT_GROWTH_DECLINE_SUPPORT,
  PARENT_GROWTH_FIRST_RECORD_BODY,
  PARENT_GROWTH_FIRST_RECORD_TITLE,
} from "@/lib/ai-growth/parentGrowthCopy";
import { GlossaryQuickBar } from "@/components/glossary/GlossaryQuickBar";

function formatSessionDateLabel(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyMessage(reason: HubGrowthSummaryEmptyReason | null): string {
  switch (reason) {
    case "no_linked_child":
      return "연결된 자녀가 없습니다. 자녀 계정을 연결하면 최근 성장을 확인할 수 있습니다.";
    case "load_error":
      return "성장 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    case "not_enough_history":
    default:
      return "코치가 훈련 리포트를 저장하면 최근 성장이 여기에 표시됩니다.";
  }
}

type Props = {
  className?: string;
  /** Hub vs Parent home — same card, optional compact link label */
  reportLinkLabel?: string;
};

/** Sprint C-1d — Parent Home · Hub minimal growth summary (delta only) */
export function ParentGrowthHomeSummaryCard({
  className,
  reportLinkLabel = "훈련 리포트 보기",
}: Props) {
  const { data, loading, emptyReason } = useHubLinkedChildGrowthSummary();
  const { report: deliveredReport, loading: deliveredLoading } = useParentLatestDeliveredReport();

  const deliveredBadge =
    deliveredReport && !deliveredLoading ? (
      <Link
        to={deliveredReport.reportHref}
        className={cn(
          "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 px-3 py-2.5 transition-colors",
          deliveredReport.isUnread
            ? "border-violet-400 bg-violet-50 hover:bg-violet-100/80"
            : "border-violet-200 bg-white/90 hover:bg-violet-50/50"
        )}
        data-testid="parent-home-new-growth-report-badge"
      >
        <span className="text-sm font-bold text-violet-950">
          {deliveredReport.isUnread ? "새 성장 리포트" : "최근 성장 리포트"}
        </span>
        {deliveredReport.deltaLabel ? (
          <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white">
            {deliveredReport.deltaLabel}
          </span>
        ) : null}
      </Link>
    ) : null;

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800",
          className
        )}
        data-testid="parent-home-growth-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        최근 성장 불러오는 중…
      </div>
    );
  }

  if (!data) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-emerald-300 bg-gradient-to-b from-emerald-50/70 to-white p-4",
          className
        )}
        data-testid="parent-home-growth-empty"
        aria-label="최근 성장"
      >
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden />
          <div>
            <h2 className="text-base font-bold text-emerald-950">최근 성장</h2>
            <p className="mt-2 text-sm leading-relaxed text-emerald-900">{emptyMessage(emptyReason)}</p>
          </div>
        </div>
        {deliveredBadge}
      </section>
    );
  }

  const { playerName, teamName, teamId, latestSessionAt, latestFirestoreDocId } = data;
  const reportHref =
    deliveredReport?.reportHref ??
    buildGrowthReportSharePath(teamId, latestFirestoreDocId);

  if (data.mode === "first_record") {
    return (
      <section
        className={cn(
          "rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50/90 p-4 shadow-sm sm:p-5",
          className
        )}
        data-testid="parent-home-growth-first-record"
        aria-label="최근 성장"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-emerald-950">최근 성장</h2>
            <p className="mt-0.5 text-xs text-emerald-800">
              {playerName} · {teamName}
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" className="border-emerald-300" asChild>
            <Link to={reportHref}>{reportLinkLabel}</Link>
          </Button>
        </div>
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-4 text-center">
          <p className="text-4xl font-black tabular-nums text-emerald-950">
            {data.currentOverall}
            <span className="text-lg font-bold">점</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-gray-600">이번 훈련</p>
          <p className="mt-2 text-[11px] text-emerald-700">
            최근 훈련 {formatSessionDateLabel(latestSessionAt)}
          </p>
        </div>
        <div className="mt-3 rounded-xl border border-emerald-200 bg-white/90 px-4 py-3 text-center">
          <p className="text-sm font-bold text-emerald-950">{PARENT_GROWTH_FIRST_RECORD_TITLE}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-emerald-900">
            {PARENT_GROWTH_FIRST_RECORD_BODY}
          </p>
        </div>
        <GlossaryQuickBar className="mt-3" />
        {deliveredBadge}
      </section>
    );
  }

  const { summary } = data;
  const { delta, currentOverall, previousOverall } = summary;
  const deltaBadge = formatParentDeltaBadge(delta.delta ?? 0);

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50/90 p-4 shadow-sm sm:p-5",
        className
      )}
      data-testid="parent-home-growth-summary"
      aria-label="최근 성장"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-emerald-950">최근 성장</h2>
          <p className="mt-0.5 text-xs text-emerald-800">
            {playerName} · {teamName}
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" className="border-emerald-300" asChild>
          <Link to={reportHref}>{reportLinkLabel}</Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <p className="text-3xl font-black tabular-nums text-emerald-950 sm:text-4xl">
          {previousOverall}
          <span className="text-base font-bold text-emerald-700">점</span>
          <span className="mx-2 text-emerald-500" aria-hidden>
            →
          </span>
          {currentOverall}
          <span className="text-base font-bold text-emerald-700">점</span>
        </p>
      </div>

      <p className="mt-3 text-center">
        <span
          className={cn(
            "inline-block rounded-full px-4 py-1.5 text-base font-black tabular-nums sm:text-lg",
            deltaBadge.tone === "up" && "bg-emerald-600 text-white",
            deltaBadge.tone === "flat" && "bg-gray-100 text-gray-800",
            deltaBadge.tone === "down" && "bg-slate-100 text-slate-800"
          )}
          data-testid="parent-home-growth-delta"
        >
          {deltaBadge.label}
        </span>
      </p>

      {deltaBadge.tone === "down" ? (
        <p className="mt-2 text-center text-xs font-medium text-emerald-900">
          {PARENT_GROWTH_DECLINE_SUPPORT}
        </p>
      ) : null}

      <p className="mt-3 text-center text-xs text-emerald-800">
        최근 훈련 {formatSessionDateLabel(latestSessionAt)}
      </p>
      <p className="mt-1 text-center text-[10px] text-emerald-700">{PARENT_GROWTH_COMPARISON_FOOTNOTE}</p>
      <GlossaryQuickBar className="mt-3" />
      {deliveredBadge}
    </section>
  );
}
