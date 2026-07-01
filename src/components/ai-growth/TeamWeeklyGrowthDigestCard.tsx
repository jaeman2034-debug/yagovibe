import { CalendarDays, Sparkles, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamWeeklyDigest } from "@/lib/ai-growth/teamWeeklyDigestTypes";

type Props = {
  digest: TeamWeeklyDigest;
  className?: string;
};

/** Sprint E-1.2-b — 이번 주 팀 성장 요약 카드 */
export function TeamWeeklyGrowthDigestCard({ digest, className }: Props) {
  const {
    weekLabel,
    avgOvr,
    avgLevel,
    riskPlayerCount,
    newBadges,
    focusTraining,
    summary,
  } = digest;

  return (
    <section
      className={cn(
        "rounded-xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 via-white to-sky-50/90 p-3 sm:p-4",
        className
      )}
      data-testid="team-weekly-growth-digest-card"
      aria-label="이번 주 팀 성장 요약"
    >
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-black text-cyan-950">
          <Sparkles className="h-4 w-4 text-cyan-600" aria-hidden />
          이번 주 팀 성장 요약
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-cyan-700">
          <CalendarDays className="h-3 w-3" aria-hidden />
          {weekLabel}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div
          className="rounded-xl border border-cyan-200 bg-white/90 px-3 py-2 text-center"
          data-testid="team-weekly-digest-avg-ovr"
        >
          <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-cyan-700">
            <TrendingUp className="h-3 w-3" aria-hidden />
            평균 OVR
          </p>
          <p className="text-lg font-black tabular-nums text-cyan-950">{avgOvr}</p>
        </div>
        <div className="rounded-xl border border-cyan-200 bg-white/90 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-cyan-700">평균 Level</p>
          <p className="text-lg font-black tabular-nums text-cyan-950">{avgLevel}</p>
        </div>
        <div
          className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-center"
          data-testid="team-weekly-digest-risk-count"
        >
          <p className="text-[10px] font-medium text-amber-800">위험 선수</p>
          <p className="text-lg font-black tabular-nums text-amber-900">{riskPlayerCount}명</p>
        </div>
        {focusTraining ? (
          <div
            className="rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 text-center"
            data-testid="team-weekly-digest-focus"
          >
            <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-violet-800">
              <Target className="h-3 w-3" aria-hidden />
              집중 훈련
            </p>
            <p className="text-sm font-bold text-violet-950">{focusTraining}</p>
          </div>
        ) : null}
      </div>

      {newBadges.length > 0 ? (
        <div
          className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2"
          data-testid="team-weekly-digest-new-badges"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">신규 배지</p>
          <p className="mt-0.5 text-sm font-bold text-amber-950">{newBadges.join(", ")}</p>
        </div>
      ) : null}

      <div
        className="mt-3 rounded-lg border border-cyan-200/80 bg-white/70 p-2.5"
        data-testid="team-weekly-digest-ai-summary"
      >
        {summary.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-xs leading-relaxed text-cyan-950">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
