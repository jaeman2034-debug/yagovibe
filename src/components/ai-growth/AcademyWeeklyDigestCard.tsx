import { Brain, CalendarDays, Sparkles, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcademyWeeklyDigest } from "@/lib/ai-growth/academyWeeklyDigestTypes";

type Props = {
  digest: AcademyWeeklyDigest | null;
  loading?: boolean;
  className?: string;
};

function formatSignedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/** Sprint F-1.2 — 이번 주 아카데미 성장 요약 */
export function AcademyWeeklyDigestCard({ digest, loading = false, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-fuchsia-200 bg-fuchsia-50/80 px-4 py-3 text-sm text-fuchsia-900",
          className
        )}
        data-testid="academy-weekly-digest-loading"
      >
        이번 주 아카데미 성장 요약 집계 중…
      </div>
    );
  }

  if (!digest) return null;

  const {
    weekLabel,
    avgOvr,
    avgLevel,
    avgOvrDelta,
    riskPlayerCount,
    newBadges,
    focusTraining,
    summary,
  } = digest;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-fuchsia-300 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50/80 p-4 shadow-sm",
        className
      )}
      data-testid="academy-weekly-digest-card"
      aria-label="이번 주 아카데미 성장 요약"
    >
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-black text-fuchsia-950">
          <Sparkles className="h-4 w-4 text-fuchsia-600" aria-hidden />
          이번 주 아카데미 성장 요약
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-fuchsia-800">
          <CalendarDays className="h-3 w-3" aria-hidden />
          {weekLabel}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div
          className="rounded-xl border border-fuchsia-200 bg-white/95 px-3 py-2 text-center"
          data-testid="academy-weekly-digest-avg-ovr"
        >
          <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-fuchsia-800">
            <TrendingUp className="h-3 w-3" aria-hidden />
            평균 OVR
          </p>
          <p className="text-lg font-black tabular-nums text-fuchsia-950">{avgOvr}</p>
          {avgOvrDelta !== null ? (
            <p className="text-[10px] font-bold text-sky-700">{formatSignedDelta(avgOvrDelta)}</p>
          ) : null}
        </div>
        <div
          className="rounded-xl border border-fuchsia-200 bg-white/95 px-3 py-2 text-center"
          data-testid="academy-weekly-digest-avg-level"
        >
          <p className="text-[10px] font-medium text-fuchsia-800">평균 Level</p>
          <p className="text-lg font-black tabular-nums text-fuchsia-950">{avgLevel}</p>
        </div>
        <div
          className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-center"
          data-testid="academy-weekly-digest-risk-count"
        >
          <p className="text-[10px] font-medium text-amber-800">위험 선수</p>
          <p className="text-lg font-black tabular-nums text-amber-900">{riskPlayerCount}명</p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {newBadges.length > 0 ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2"
            data-testid="academy-weekly-digest-new-badges"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
              신규 배지 {newBadges.length}개
            </p>
            <p className="mt-0.5 text-sm font-bold text-amber-950">{newBadges.join(", ")}</p>
          </div>
        ) : null}
        {focusTraining ? (
          <div
            className="rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2"
            data-testid="academy-weekly-digest-focus"
          >
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-800">
              <Target className="h-3 w-3" aria-hidden />
              집중 훈련
            </p>
            <p className="mt-0.5 text-sm font-bold text-violet-950">{focusTraining}</p>
          </div>
        ) : null}
      </div>

      <div
        className="mt-3 rounded-lg border border-fuchsia-200/80 bg-white/75 p-2.5"
        data-testid="academy-weekly-digest-ai-summary"
      >
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-fuchsia-800">
          <Brain className="h-3 w-3" aria-hidden />
          AI 아카데미 Digest
        </p>
        {summary.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-xs leading-relaxed text-fuchsia-950">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
