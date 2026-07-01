import { Link } from "react-router-dom";
import { CalendarDays, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useParentWeeklyGrowthDigest,
  type ParentWeeklyGrowthDigestEmptyReason,
} from "@/hooks/useParentWeeklyGrowthDigest";

function emptyMessage(reason: ParentWeeklyGrowthDigestEmptyReason | null): string {
  switch (reason) {
    case "no_linked_child":
      return "연결된 자녀가 없습니다.";
    case "no_avatar":
      return "코치가 훈련 리포트를 저장하면 이번 주 성장 요약이 표시됩니다.";
    case "load_error":
      return "이번 주 성장 요약을 불러오지 못했습니다.";
    case "no_parent_membership":
    default:
      return "보호자로 등록된 팀이 없습니다.";
  }
}

type Props = {
  className?: string;
};

/** Sprint D-5.3-b — Parent Home 주간 성장 요약 (Avatar · Badge · Recommendation) */
export function ParentWeeklyGrowthDigestCard({ className }: Props) {
  const { data, loading, emptyReason } = useParentWeeklyGrowthDigest();

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-800",
          className
        )}
        data-testid="parent-weekly-growth-digest-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        이번 주 성장 요약 불러오는 중…
      </div>
    );
  }

  if (!data) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-indigo-300 bg-gradient-to-b from-indigo-50/70 to-white p-4",
          className
        )}
        data-testid="parent-weekly-growth-digest-empty"
        aria-label="이번 주 성장 요약"
      >
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-5 w-5 text-indigo-600" aria-hidden />
          <div>
            <h2 className="text-base font-bold text-indigo-950">이번 주 성장 요약</h2>
            <p className="mt-2 text-sm leading-relaxed text-indigo-900">{emptyMessage(emptyReason)}</p>
          </div>
        </div>
      </section>
    );
  }

  const { playerName, teamName, weekKey, summary, reportHref, ovrLine } = data;
  const growth = summary.growth;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50/90 p-4 shadow-sm sm:p-5",
        className
      )}
      data-testid="parent-weekly-growth-digest-card"
      aria-label="이번 주 성장 요약"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-black text-indigo-950">
            <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden />
            이번 주 성장 요약
          </h2>
          <p className="mt-0.5 text-xs text-indigo-800">
            {playerName} · {teamName}
          </p>
          <p className="mt-0.5 text-[10px] text-indigo-600">{weekKey}</p>
        </div>
        {reportHref !== "#" ? (
          <Button type="button" size="sm" variant="secondary" className="border-indigo-300" asChild>
            <Link to={reportHref}>리포트</Link>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {ovrLine ? (
          <div
            className="rounded-xl border border-indigo-200 bg-white px-3 py-2.5"
            data-testid="weekly-digest-ovr"
          >
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
              <TrendingUp className="h-3 w-3" aria-hidden />
              OVR
            </p>
            <p className="mt-1 text-xl font-black tabular-nums text-indigo-950">{ovrLine}</p>
          </div>
        ) : null}

        {growth?.newBadges && growth.newBadges.length > 0 ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5"
            data-testid="weekly-digest-new-badges"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">신규 배지</p>
            <p className="mt-1 text-sm font-bold text-amber-950">{growth.newBadges.join(", ")}</p>
          </div>
        ) : null}

        {growth?.focusRecommendation ? (
          <div
            className="rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2.5"
            data-testid="weekly-digest-focus"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-800">추천 훈련</p>
            <p className="mt-1 text-sm font-bold text-violet-950">{growth.focusRecommendation}</p>
          </div>
        ) : null}

        {growth?.nextGoal ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5"
            data-testid="weekly-digest-next-goal"
          >
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              <Target className="h-3 w-3" aria-hidden />
              다음 목표
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-950">{growth.nextGoal}</p>
          </div>
        ) : null}
      </div>

      {summary.strengths[0] ? (
        <p className="mt-3 text-xs text-indigo-900">
          <span className="font-semibold">이번 주 강점</span> · {summary.strengths[0]}
        </p>
      ) : null}
    </section>
  );
}
