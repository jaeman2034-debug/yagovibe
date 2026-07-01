import { CalendarDays, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachTrainingPlannerResult } from "@/lib/ai-growth/coachTrainingPlannerTypes";

type Props = {
  planner: CoachTrainingPlannerResult | null;
  loading?: boolean;
  className?: string;
};

function DayCell({ day }: { day: CoachTrainingPlannerResult["days"][number] }) {
  return (
    <div
      className="rounded-xl border border-indigo-200 bg-white/90 px-3 py-2.5 text-center"
      data-testid={`training-plan-day-${day.dayKey}`}
    >
      <p className="text-xs font-bold text-indigo-700">{day.dayLabel}</p>
      <p className="mt-1 text-sm font-black text-indigo-950">{day.themeLabel}</p>
      {day.detail ? (
        <p className="mt-0.5 text-[10px] leading-snug text-indigo-800">{day.detail}</p>
      ) : null}
    </div>
  );
}

/** Sprint E-2.2 — 이번 주 훈련 계획 */
export function CoachTrainingPlannerCard({ planner, loading = false, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900",
          className
        )}
        data-testid="coach-training-planner-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        훈련 계획 생성 중…
      </div>
    );
  }

  if (!planner || planner.days.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/60 p-4 shadow-sm",
        className
      )}
      data-testid="coach-training-planner-card"
      aria-label="이번 주 훈련 계획"
    >
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-black text-indigo-950">
          <CalendarDays className="h-4 w-4 text-indigo-600" aria-hidden />
          {planner.headline}
        </h2>
        {planner.subline ? (
          <p className="mt-0.5 text-[11px] text-indigo-800">{planner.subline}</p>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2" data-testid="coach-training-planner-days">
        {planner.days.map((day) => (
          <DayCell key={day.dayKey} day={day} />
        ))}
      </div>
    </section>
  );
}
