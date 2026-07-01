/**
 * J1-1 — Parent Home Weekly Growth Digest (read-only · I12 projection composite)
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Sparkles, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logJ0ParentCriticalPath } from "@/lib/ai-growth/j0ParentCriticalPathLog";
import type {
  ParentHomeGrowthSummarySlice,
  ParentHomeWeeklyDigestSlice,
} from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import { buildParentWeeklyGrowthDigestView } from "@/lib/ai-growth/parentWeeklyGrowthDigestView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import { cn } from "@/lib/utils";

type Props = {
  teamId: string;
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  growthSummary: ParentHomeGrowthSummarySlice;
  timeline: PlayerGrowthTimeline | null;
  weeklyDigest: ParentHomeWeeklyDigestSlice | null;
  className?: string;
};

export function ParentWeeklyGrowthDigestPanel({
  teamId,
  playerId,
  playerName,
  avatar,
  growthSummary,
  timeline,
  weeklyDigest,
  className,
}: Props) {
  const view = buildParentWeeklyGrowthDigestView({
    playerName,
    avatar,
    growthSummary,
    timeline,
    weeklyDigest,
  });

  useEffect(() => {
    logJ0ParentCriticalPath(
      "weekly_digest_render",
      view.isEmpty ? "empty" : "success",
      { teamId, playerId, weekKey: view.weekKey },
      view.isEmpty ? { emptyMessage: view.emptyMessage } : undefined
    );
  }, [teamId, playerId, view.isEmpty, view.weekKey, view.emptyMessage]);

  if (view.isEmpty) {
    return (
      <section
        className={cn(
          "mt-3 rounded-2xl border border-dashed border-indigo-300 bg-gradient-to-b from-indigo-50/70 to-white p-4",
          className
        )}
        data-testid="j11-weekly-digest-empty"
        aria-label="이번 주 성장 요약"
      >
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-5 w-5 text-indigo-600" aria-hidden />
          <div>
            <h2 className="text-base font-bold text-indigo-950">이번 주 성장 요약</h2>
            <p className="mt-2 text-sm leading-relaxed text-indigo-900">{view.emptyMessage}</p>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-indigo-600">read-only · 코치 승인 데이터 기반</p>
      </section>
    );
  }

  const reportHref = view.reportHref;

  return (
    <section
      className={cn(
        "mt-3 rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50/90 p-4 shadow-sm",
        className
      )}
      data-testid="j11-weekly-digest-panel"
      aria-label="이번 주 성장 요약"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-black text-indigo-950">
            <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden />
            이번 주 성장 요약
          </h2>
          <p className="mt-0.5 text-[10px] text-indigo-600">{view.weekKey}</p>
        </div>
        {reportHref && reportHref !== "#" ? (
          <Button type="button" size="sm" variant="secondary" className="border-indigo-300" asChild>
            <Link to={reportHref} data-testid="j11-weekly-digest-report-link">
              리포트
            </Link>
          </Button>
        ) : null}
      </div>

      {view.ovrHeadline ? (
        <p
          className="mt-3 text-xl font-black tabular-nums text-indigo-950"
          data-testid="j11-weekly-digest-ovr"
        >
          <TrendingUp className="mr-1 inline h-4 w-4 text-indigo-600" aria-hidden />
          {view.ovrHeadline}
        </p>
      ) : null}

      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-indigo-950">
        {view.highlightLine ? (
          <li data-testid="j11-weekly-digest-highlight">{view.highlightLine}</li>
        ) : null}
        {view.badgeLine ? (
          <li className="font-semibold text-amber-950" data-testid="j11-weekly-digest-badge">
            {view.badgeLine}
          </li>
        ) : null}
        {view.nextGoalLine ? (
          <li
            className="flex items-start gap-1 font-medium text-emerald-900"
            data-testid="j11-weekly-digest-next-goal"
          >
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
            <span>{view.nextGoalLine}</span>
          </li>
        ) : null}
      </ul>

      <p className="mt-3 text-[10px] text-indigo-600">read-only · 코치 승인 데이터 기반</p>
    </section>
  );
}
