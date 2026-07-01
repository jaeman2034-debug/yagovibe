import type { ReactNode } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  TrendingUp,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FederationCoachBenchmarkResult } from "@/lib/ai-growth/federationCoachBenchmarkTypes";

type Props = {
  benchmark: FederationCoachBenchmarkResult | null;
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
      className="flex flex-col items-center rounded-xl border border-emerald-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-800">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-black tabular-nums text-emerald-950">{value}</p>
    </div>
  );
}

function formatPct(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${value}%` : "—";
}

function formatSignedDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "—";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/** Sprint H-1.3 — Federation Coach Benchmark */
export function FederationCoachBenchmarkCard({
  benchmark,
  loading = false,
  className,
}: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900",
          className
        )}
        data-testid="federation-coach-benchmark-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Federation Coach Benchmark 집계 중…
      </div>
    );
  }

  if (!benchmark) return null;

  const { kpi, federations, digest, isEmpty } = benchmark;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="federation-coach-benchmark-card"
      data-empty={isEmpty ? "true" : "false"}
      aria-label="Federation Coach Benchmark"
    >
      <h3 className="text-sm font-black text-emerald-950">연맹 코치 벤치마크</h3>
      {benchmark.subline ? (
        <p className="mt-0.5 text-[11px] text-emerald-800">{benchmark.subline}</p>
      ) : null}
      {isEmpty ? (
        <p
          className="mt-1 text-[11px] leading-relaxed text-emerald-800"
          data-testid="federation-coach-benchmark-empty"
        >
          {kpi.federationCount === 0
            ? "아카데미에 연맹 소속(federationId)을 연결하면 코치 벤치마크가 집계됩니다."
            : "2개 이상 연맹을 관리하면 코치 벤치마크 비교가 활성화됩니다."}
        </p>
      ) : null}

      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
        data-testid="federation-coach-benchmark-metrics"
      >
        <Metric
          icon={<UserCog className="h-3 w-3" aria-hidden />}
          label="코치 수"
          value={kpi.totalCoachCount}
          testId="federation-coach-count"
        />
        <Metric
          icon={<CalendarDays className="h-3 w-3" aria-hidden />}
          label="활성 세션"
          value={kpi.totalActiveSessions}
          testId="federation-coach-active-sessions"
        />
        <Metric
          icon={<ClipboardCheck className="h-3 w-3" aria-hidden />}
          label="출석 기록률"
          value={formatPct(kpi.avgAttendanceRecordingRate)}
          testId="federation-coach-attendance-recording"
        />
        <Metric
          icon={<TrendingUp className="h-3 w-3" aria-hidden />}
          label="성장 기여"
          value={formatSignedDelta(kpi.avgGrowthContributionRate)}
          testId="federation-coach-growth-contribution"
        />
        <Metric
          icon={<ShieldCheck className="h-3 w-3" aria-hidden />}
          label="위험 개선률"
          value={formatPct(kpi.avgAtRiskImprovementRate)}
          testId="federation-coach-risk-improvement"
        />
      </div>

      <div
        className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5"
        data-testid="federation-coach-benchmark-digest"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
          {digest.headline}
        </p>
        <p className="mt-1 text-sm font-bold text-emerald-950">{digest.summaryLines.join(" · ")}</p>
      </div>

      {federations.length > 0 ? (
        <div className="mt-3 space-y-2" data-testid="federation-coach-benchmark-list">
          {federations.map((federation) => (
            <div
              key={federation.federationId}
              className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-2"
              data-testid={`federation-coach-row-${federation.federationId}`}
            >
              <p className="text-sm font-bold text-emerald-950">{federation.federationName}</p>
              <p className="mt-0.5 text-[11px] text-emerald-800">
                코치 {federation.coachCount}명 · 세션 {federation.activeSessionCount}회 · 출석 기록{" "}
                {formatPct(federation.attendanceRecordingRate)} · 성장{" "}
                {formatSignedDelta(federation.growthContributionRate)} · 위험 개선{" "}
                {formatPct(federation.atRiskImprovementRate)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
