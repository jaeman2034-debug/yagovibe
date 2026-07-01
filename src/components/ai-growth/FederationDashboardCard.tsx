import type { ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  Gauge,
  Landmark,
  Layers,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FederationDashboardResult } from "@/lib/ai-growth/federationDashboardTypes";

type Props = {
  dashboard: FederationDashboardResult | null;
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
      <div className="flex items-center gap-1 text-[10px] font-medium text-violet-800">
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

/** Sprint H-1.1 — Federation Dashboard */
export function FederationDashboardCard({ dashboard, loading = false, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900",
          className
        )}
        data-testid="federation-dashboard-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Federation Dashboard 집계 중…
      </div>
    );
  }

  if (!dashboard) return null;

  const { kpi, federations, isEmpty } = dashboard;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-purple-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="federation-dashboard-card"
      data-empty={isEmpty ? "true" : "false"}
      aria-label="Federation Dashboard"
    >
      <div>
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
          <Landmark className="h-3 w-3" aria-hidden />
          Federation Dashboard
        </p>
        <h2 className="mt-0.5 text-base font-black text-violet-950">연맹 통합 운영</h2>
        {dashboard.subline ? (
          <p className="mt-0.5 text-[11px] text-violet-800">{dashboard.subline}</p>
        ) : null}
      </div>

      {isEmpty ? (
        <p
          className="mt-2 text-[11px] leading-relaxed text-violet-800"
          data-testid="federation-dashboard-empty"
        >
          {kpi.federationCount === 0
            ? "아카데미에 연맹 소속(federationId)을 연결하거나 연맹 관리자로 등록하면 집계됩니다."
            : "2개 이상 연맹을 관리하면 통합 KPI 비교가 활성화됩니다."}
        </p>
      ) : null}

      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
        data-testid="federation-dashboard-metrics"
      >
        <Metric
          icon={<Layers className="h-3 w-3" aria-hidden />}
          label="연맹 수"
          value={kpi.federationCount}
          testId="federation-count"
          accent="text-violet-950"
        />
        <Metric
          icon={<Building2 className="h-3 w-3" aria-hidden />}
          label="소속 아카데미"
          value={kpi.academyCount}
          testId="federation-academy-count"
          accent="text-violet-950"
        />
        <Metric
          icon={<Users className="h-3 w-3" aria-hidden />}
          label="소속 선수"
          value={kpi.playerCount}
          testId="federation-player-count"
          accent="text-violet-950"
        />
        <Metric
          icon={<TrendingUp className="h-3 w-3" aria-hidden />}
          label="평균 OVR"
          value={kpi.avgOvr ?? "—"}
          testId="federation-avg-ovr"
          accent="text-sky-700"
        />
        <Metric
          icon={<Gauge className="h-3 w-3" aria-hidden />}
          label="평균 성장률"
          value={formatSignedDelta(kpi.avgGrowthRate)}
          testId="federation-avg-growth"
          accent="text-emerald-700"
        />
        <Metric
          icon={<AlertTriangle className="h-3 w-3" aria-hidden />}
          label="위험 선수"
          value={kpi.atRiskPlayerCount}
          testId="federation-at-risk"
          accent="text-amber-700"
        />
      </div>

      {federations.length > 0 ? (
        <div className="mt-3 space-y-2" data-testid="federation-dashboard-list">
          {federations.map((federation) => (
            <div
              key={federation.federationId}
              className="rounded-xl border border-violet-200 bg-white/90 px-3 py-2"
              data-testid={`federation-row-${federation.federationId}`}
            >
              <p className="text-sm font-bold text-violet-950">{federation.federationName}</p>
              <p className="mt-0.5 text-[11px] text-violet-800">
                아카데미 {federation.academyCount}개 · 선수 {federation.playerCount}명 · 추적{" "}
                {federation.trackedPlayers}명 · OVR {federation.avgOvr ?? "—"} · 성장{" "}
                {formatSignedDelta(federation.avgGrowthRate)} · 위험{" "}
                {federation.atRiskPlayerCount}명
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
