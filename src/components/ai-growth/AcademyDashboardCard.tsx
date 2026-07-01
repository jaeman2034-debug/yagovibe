import type { ReactNode } from "react";
import {
  Building2,
  Loader2,
  Users,
  TrendingUp,
  AlertTriangle,
  HeartHandshake,
  Layers,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcademyDashboardResult } from "@/lib/ai-growth/academyDashboardTypes";

type Props = {
  dashboard: AcademyDashboardResult | null;
  loading?: boolean;
  className?: string;
};

type MetricProps = {
  icon: ReactNode;
  label: string;
  value: number | string;
  testId: string;
  accent?: string;
};

function Metric({ icon, label, value, testId, accent = "text-slate-950" }: MetricProps) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border border-violet-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-violet-700">
        {icon}
        {label}
      </div>
      <p className={cn("mt-0.5 text-lg font-black tabular-nums", accent)}>{value}</p>
    </div>
  );
}

/** Sprint F-1.1 — 아카데미 운영 대시보드 */
export function AcademyDashboardCard({ dashboard, loading = false, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900",
          className
        )}
        data-testid="academy-dashboard-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        아카데미 대시보드 집계 중…
      </div>
    );
  }

  if (!dashboard) return null;

  const s = dashboard.snapshot;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="academy-dashboard-card"
      aria-label="아카데미 대시보드"
    >
      <div>
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
          <Building2 className="h-3 w-3" aria-hidden />
          아카데미 대시보드
        </p>
        <h2 className="mt-0.5 text-base font-black text-violet-950">{dashboard.headline}</h2>
        {dashboard.subline ? (
          <p className="mt-0.5 text-[11px] text-violet-800">{dashboard.subline}</p>
        ) : null}
      </div>

      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
        data-testid="academy-dashboard-metrics"
      >
        <Metric
          icon={<Users className="h-3 w-3" aria-hidden />}
          label="총 선수"
          value={s.totalPlayers}
          testId="academy-dashboard-total-players"
          accent="text-violet-950"
        />
        <Metric
          icon={<Layers className="h-3 w-3" aria-hidden />}
          label="총 팀"
          value={s.teamCount}
          testId="academy-dashboard-team-count"
          accent="text-violet-900"
        />
        <Metric
          icon={<TrendingUp className="h-3 w-3" aria-hidden />}
          label="평균 OVR"
          value={s.trackedPlayers > 0 ? s.avgOvr : "—"}
          testId="academy-dashboard-avg-ovr"
          accent="text-sky-700"
        />
        <Metric
          icon={<Gauge className="h-3 w-3" aria-hidden />}
          label="평균 Level"
          value={s.trackedPlayers > 0 ? s.avgLevel : "—"}
          testId="academy-dashboard-avg-level"
          accent="text-indigo-700"
        />
        <Metric
          icon={<AlertTriangle className="h-3 w-3" aria-hidden />}
          label="위험 선수"
          value={s.atRiskCount}
          testId="academy-dashboard-at-risk"
          accent="text-amber-700"
        />
        <Metric
          icon={<HeartHandshake className="h-3 w-3" aria-hidden />}
          label="활성 보호자"
          value={s.activeGuardianCount}
          testId="academy-dashboard-guardians"
          accent="text-emerald-700"
        />
      </div>
    </section>
  );
}
