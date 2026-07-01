import type { ReactNode } from "react";
import {
  Award,
  Brain,
  Loader2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcademyCoachPerformanceResult } from "@/lib/ai-growth/academyCoachPerformanceTypes";

type Props = {
  performance: AcademyCoachPerformanceResult | null;
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

function formatSignedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function Metric({ icon, label, value, testId, accent = "text-slate-950" }: MetricProps) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border border-emerald-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-800">
        {icon}
        {label}
      </div>
      <p className={cn("mt-0.5 text-lg font-black tabular-nums", accent)}>{value}</p>
    </div>
  );
}

/** Sprint F-1.3 — 아카데미 코치 성과 */
export function AcademyCoachPerformanceCard({ performance, loading = false, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900",
          className
        )}
        data-testid="academy-coach-performance-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        코치 성과 집계 중…
      </div>
    );
  }

  if (!performance) return null;

  const { kpi, coaches, impact, summary } = performance;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="academy-coach-performance-card"
      aria-label="코치 성과"
    >
      <h3 className="text-sm font-black text-emerald-950">{performance.headline}</h3>

      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"
        data-testid="academy-coach-performance-kpi"
      >
        <Metric
          icon={<Users className="h-3 w-3" aria-hidden />}
          label="담당 선수"
          value={kpi.playerCount}
          testId="academy-coach-player-count"
        />
        <Metric
          icon={<TrendingUp className="h-3 w-3" aria-hidden />}
          label="평균 OVR"
          value={kpi.avgOvr}
          testId="academy-coach-avg-ovr"
          accent="text-sky-800"
        />
        <Metric
          icon={<TrendingDown className="h-3 w-3" aria-hidden />}
          label="평균 성장률"
          value={kpi.avgGrowthRate !== null ? formatSignedDelta(kpi.avgGrowthRate) : "—"}
          testId="academy-coach-avg-growth"
          accent="text-indigo-800"
        />
        <Metric
          icon={<UserCheck className="h-3 w-3" aria-hidden />}
          label="위험 관리율"
          value={`${kpi.riskManagementRate}%`}
          testId="academy-coach-risk-management"
          accent="text-amber-800"
        />
        <Metric
          icon={<Award className="h-3 w-3" aria-hidden />}
          label="배지 획득"
          value={kpi.badgeCount}
          testId="academy-coach-badge-count"
          accent="text-violet-800"
        />
      </div>

      <div className="mt-3 space-y-2" data-testid="academy-coach-ranking">
        {coaches.map((coach) => (
          <div
            key={coach.coachId}
            className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-2.5"
            data-testid={`academy-coach-row-${coach.coachId}`}
          >
            <p className="text-sm font-bold text-emerald-950">{coach.coachLabel}</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-emerald-900 sm:grid-cols-3">
              <span>담당 선수: {coach.playerCount}명</span>
              <span>평균 OVR: {coach.avgOvr}</span>
              <span>
                평균 성장률:{" "}
                {coach.avgGrowthRate !== null ? formatSignedDelta(coach.avgGrowthRate) : "—"}
              </span>
              <span>위험 선수: {coach.atRiskCount}명</span>
              <span>관리율: {coach.riskManagementRate}%</span>
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
        data-testid="academy-coach-impact"
      >
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-center">
          <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-rose-800">
            <HeartPulse className="h-3 w-3" aria-hidden />
            Recovery 위험 선수
          </p>
          <p className="text-lg font-black tabular-nums text-rose-900" data-testid="academy-coach-impact-recovery">
            {impact.recoveryRiskCount}명
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-amber-800">성장 하락 선수</p>
          <p className="text-lg font-black tabular-nums text-amber-900" data-testid="academy-coach-impact-decline">
            {impact.declineCount}명
          </p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-orange-800">집중 관리 필요</p>
          <p className="text-lg font-black tabular-nums text-orange-900" data-testid="academy-coach-impact-focus">
            {impact.needsFocusCount}명
          </p>
        </div>
      </div>

      <div
        className="mt-3 rounded-lg border border-emerald-200/80 bg-white/75 p-2.5"
        data-testid="academy-coach-ai-summary"
      >
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
          <Brain className="h-3 w-3" aria-hidden />
          AI 코치 성과 요약
        </p>
        {summary.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-xs leading-relaxed text-emerald-950">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
