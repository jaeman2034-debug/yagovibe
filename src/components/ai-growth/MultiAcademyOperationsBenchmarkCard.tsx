import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Loader2,
  Medal,
  Percent,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MultiAcademyOperationsBenchmarkResult } from "@/lib/ai-growth/multiAcademyOperationsBenchmarkTypes";

type Props = {
  benchmark: MultiAcademyOperationsBenchmarkResult | null;
  loading?: boolean;
  className?: string;
};

type MetricProps = {
  icon: ReactNode;
  label: string;
  value: number | string;
  testId: string;
};

function Metric({ icon, label, value, testId }: MetricProps) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border border-cyan-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-cyan-800">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-black tabular-nums text-cyan-950">{value}</p>
    </div>
  );
}

function formatPct(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${value}%` : "—";
}

/** Sprint G-1.4 — Multi Academy Operations Benchmark */
export function MultiAcademyOperationsBenchmarkCard({
  benchmark,
  loading = false,
  className,
}: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-900",
          className
        )}
        data-testid="multi-academy-operations-benchmark-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Operations Benchmark 집계 중…
      </div>
    );
  }

  if (!benchmark) return null;

  const { kpi, academies, digest, isEmpty } = benchmark;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 via-white to-sky-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="multi-academy-operations-benchmark-card"
      data-empty={isEmpty ? "true" : "false"}
      aria-label="Multi Academy Operations Benchmark"
    >
      <h3 className="text-sm font-black text-cyan-950">운영 벤치마크</h3>
      {benchmark.subline ? (
        <p className="mt-0.5 text-[11px] text-cyan-800">{benchmark.subline}</p>
      ) : null}
      {isEmpty ? (
        <p
          className="mt-1 text-[11px] leading-relaxed text-cyan-800"
          data-testid="multi-academy-operations-benchmark-empty"
        >
          2개 이상 아카데미를 운영하면 운영 비교·순위가 활성화됩니다.
        </p>
      ) : null}

      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
        data-testid="multi-academy-operations-benchmark-metrics"
      >
        <Metric
          icon={<Percent className="h-3 w-3" aria-hidden />}
          label="출석률"
          value={formatPct(kpi.avgAttendanceRatePct)}
          testId="multi-academy-ops-attendance"
        />
        <Metric
          icon={<Activity className="h-3 w-3" aria-hidden />}
          label="세션 운영률"
          value={formatPct(kpi.avgSessionOperationRate)}
          testId="multi-academy-ops-session-rate"
        />
        <Metric
          icon={<ClipboardList className="h-3 w-3" aria-hidden />}
          label="미기록률"
          value={formatPct(kpi.avgUnrecordedRatePct)}
          testId="multi-academy-ops-unrecorded"
        />
        <Metric
          icon={<AlertTriangle className="h-3 w-3" aria-hidden />}
          label="위험 선수"
          value={formatPct(kpi.avgAtRiskPlayerPct)}
          testId="multi-academy-ops-at-risk"
        />
        <Metric
          icon={<UserCog className="h-3 w-3" aria-hidden />}
          label="활성 코치"
          value={formatPct(kpi.avgActiveCoachRatio)}
          testId="multi-academy-ops-coach-ratio"
        />
        <Metric
          icon={<Medal className="h-3 w-3" aria-hidden />}
          label="건전성"
          value={kpi.avgOperationalHealthScore ?? "—"}
          testId="multi-academy-ops-health-score"
        />
      </div>

      <div
        className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/70 px-3 py-2.5"
        data-testid="multi-academy-operations-benchmark-digest"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-800">
          {digest.headline}
        </p>
        <p className="mt-1 text-sm font-bold text-cyan-950">{digest.summaryLines.join(" · ")}</p>
      </div>

      {academies.length > 0 ? (
        <div className="mt-3 space-y-2" data-testid="multi-academy-operations-benchmark-list">
          {academies.map((academy) => (
            <div
              key={academy.teamId}
              className="rounded-xl border border-cyan-200 bg-white/90 px-3 py-2"
              data-testid={`multi-academy-operations-benchmark-row-${academy.teamId}`}
            >
              <p className="text-sm font-bold text-cyan-950">
                #{academy.rank} {academy.teamName}
                {academy.operationalHealthScore !== null
                  ? ` · ${academy.operationalHealthScore}점`
                  : ""}
              </p>
              <p className="mt-0.5 text-[11px] text-cyan-800">
                출석 {formatPct(academy.attendanceRatePct)} · 운영{" "}
                {formatPct(academy.sessionOperationRate)} · 미기록{" "}
                {formatPct(academy.unrecordedRatePct)} · 위험{" "}
                {formatPct(academy.atRiskPlayerPct)} · 코치 {formatPct(academy.activeCoachRatio)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
