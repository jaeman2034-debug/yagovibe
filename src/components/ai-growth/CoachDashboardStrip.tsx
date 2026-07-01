import type { ReactNode } from "react";
import { Loader2, UserCheck, Users, Dumbbell, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachDashboardSnapshot } from "@/lib/ai-growth/coachDashboardTypes";

type Props = {
  dashboard: CoachDashboardSnapshot | null;
  loading?: boolean;
  className?: string;
};

type MetricProps = {
  icon: ReactNode;
  label: string;
  value: number;
  testId: string;
  accent?: string;
};

function Metric({ icon, label, value, testId, accent = "text-slate-950" }: MetricProps) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border border-slate-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
        {icon}
        {label}
      </div>
      <p className={cn("mt-0.5 text-lg font-black tabular-nums", accent)}>{value}</p>
    </div>
  );
}

/** Sprint E-2.4 — 코치 대시보드 요약 스트립 */
export function CoachDashboardStrip({ dashboard, loading = false, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700",
          className
        )}
        data-testid="coach-dashboard-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        코치 대시보드 집계 중…
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50/80 p-3 shadow-sm",
        className
      )}
      data-testid="coach-dashboard-strip"
      aria-label="코치 대시보드"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          icon={<UserCheck className="h-3 w-3" aria-hidden />}
          label="오늘 조치 필요"
          value={dashboard.actionNeededCount}
          testId="coach-dashboard-action-needed"
          accent="text-rose-700"
        />
        <Metric
          icon={<Users className="h-3 w-3" aria-hidden />}
          label="위험 선수"
          value={dashboard.atRiskCount}
          testId="coach-dashboard-at-risk"
          accent="text-amber-700"
        />
        <Metric
          icon={<Dumbbell className="h-3 w-3" aria-hidden />}
          label="추천 훈련"
          value={dashboard.recommendedTrainingCount}
          testId="coach-dashboard-training-recs"
          accent="text-sky-700"
        />
        <Metric
          icon={<Bell className="h-3 w-3" aria-hidden />}
          label="알림"
          value={dashboard.alertCount}
          testId="coach-dashboard-alerts"
          accent="text-violet-700"
        />
      </div>
    </section>
  );
}
