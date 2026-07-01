import type { ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  Gauge,
  Layers,
  Loader2,
  TrendingUp,
  Users,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MultiAcademyDashboardResult } from "@/lib/ai-growth/multiAcademyDashboardTypes";

type Props = {
  dashboard: MultiAcademyDashboardResult | null;
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
      className="flex flex-col items-center rounded-xl border border-indigo-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-indigo-800">
        {icon}
        {label}
      </div>
      <p className={cn("mt-0.5 text-lg font-black tabular-nums", accent)}>{value}</p>
    </div>
  );
}

function formatSignedDelta(delta: number | null): string {
  if (delta === null) return "—";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/** Sprint G-1.1 — Multi Academy Dashboard */
export function MultiAcademyDashboardCard({
  dashboard,
  loading = false,
  className,
}: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900",
          className
        )}
        data-testid="multi-academy-dashboard-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Multi Academy Dashboard 집계 중…
      </div>
    );
  }

  if (!dashboard) return null;

  const { kpi, academies, isEmpty } = dashboard;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-blue-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="multi-academy-dashboard-card"
      data-empty={isEmpty ? "true" : "false"}
      aria-label="Multi Academy Dashboard"
    >
      <div>
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
          <Building2 className="h-3 w-3" aria-hidden />
          Multi Academy Dashboard
        </p>
        <h2 className="mt-0.5 text-base font-black text-indigo-950">아카데미 통합 운영</h2>
        {dashboard.subline ? (
          <p className="mt-0.5 text-[11px] text-indigo-800">{dashboard.subline}</p>
        ) : null}
      </div>

      {isEmpty ? (
        <p
          className="mt-2 text-[11px] leading-relaxed text-indigo-800"
          data-testid="multi-academy-dashboard-empty"
        >
          2개 이상 아카데미를 운영하면 통합 KPI 비교가 활성화됩니다.
        </p>
      ) : null}

      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
        data-testid="multi-academy-dashboard-metrics"
      >
        <Metric
          icon={<Layers className="h-3 w-3" aria-hidden />}
          label="아카데미 수"
          value={kpi.academyCount}
          testId="multi-academy-count"
          accent="text-indigo-950"
        />
        <Metric
          icon={<Users className="h-3 w-3" aria-hidden />}
          label="총 선수"
          value={kpi.playerCount}
          testId="multi-academy-player-count"
          accent="text-indigo-950"
        />
        <Metric
          icon={<TrendingUp className="h-3 w-3" aria-hidden />}
          label="평균 OVR"
          value={kpi.avgOvr ?? "—"}
          testId="multi-academy-avg-ovr"
          accent="text-sky-700"
        />
        <Metric
          icon={<Gauge className="h-3 w-3" aria-hidden />}
          label="평균 성장률"
          value={formatSignedDelta(kpi.avgGrowthRate)}
          testId="multi-academy-avg-growth"
          accent="text-emerald-700"
        />
        <Metric
          icon={<AlertTriangle className="h-3 w-3" aria-hidden />}
          label="위험 선수"
          value={kpi.atRiskPlayerCount}
          testId="multi-academy-at-risk"
          accent="text-amber-700"
        />
        <Metric
          icon={<UserCog className="h-3 w-3" aria-hidden />}
          label="활성 코치"
          value={kpi.activeCoachCount}
          testId="multi-academy-active-coaches"
          accent="text-violet-700"
        />
      </div>

      {academies.length > 0 ? (
        <div className="mt-3 space-y-2" data-testid="multi-academy-dashboard-list">
          {academies.map((academy) => (
            <div
              key={academy.teamId}
              className="rounded-xl border border-indigo-200 bg-white/90 px-3 py-2"
              data-testid={`multi-academy-row-${academy.teamId}`}
            >
              <p className="text-sm font-bold text-indigo-950">{academy.teamName}</p>
              <p className="mt-0.5 text-[11px] text-indigo-800">
                선수 {academy.playerCount}명 · 추적 {academy.trackedPlayers}명 · OVR{" "}
                {academy.avgOvr ?? "—"} · 성장 {formatSignedDelta(academy.avgGrowthRate)} · 위험{" "}
                {academy.atRiskPlayerCount}명
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
