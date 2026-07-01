import type { ReactNode } from "react";
import {
  Brain,
  CalendarDays,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcademyCoachOperationsResult } from "@/lib/ai-growth/academyCoachOperationsTypes";

type Props = {
  operations: AcademyCoachOperationsResult | null;
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
      className="flex flex-col items-center rounded-xl border border-violet-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-violet-800">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-black tabular-nums text-violet-950">{value}</p>
    </div>
  );
}

/** Sprint F-2.3-c — 아카데미 코치 운영 인텔리전스 */
export function AcademyCoachOperationsDashboardCard({
  operations,
  loading = false,
  className,
}: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900",
          className
        )}
        data-testid="academy-coach-operations-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        코치 운영 인텔리전스 집계 중…
      </div>
    );
  }

  if (!operations) return null;

  const { kpi, coaches, digest, aiSummary, isEmpty } = operations;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-purple-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="academy-coach-operations-card"
      data-empty={isEmpty ? "true" : "false"}
      aria-label="코치 운영 인텔리전스"
    >
      <h3 className="text-sm font-black text-violet-950">{operations.headline}</h3>
      {isEmpty ? (
        <p
          className="mt-1 text-[11px] leading-relaxed text-violet-800"
          data-testid="academy-coach-operations-empty"
        >
          훈련 세션과 출석 기록 후 코치별 운영 KPI가 표시됩니다.
        </p>
      ) : null}

      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
        data-testid="academy-coach-operations-metrics"
      >
        <Metric
          icon={<Users className="h-3 w-3" aria-hidden />}
          label="운영 코치"
          value={kpi.coachCount}
          testId="academy-coach-operations-coach-count"
        />
        <Metric
          icon={<CalendarDays className="h-3 w-3" aria-hidden />}
          label="최근 세션"
          value={kpi.totalSessions}
          testId="academy-coach-operations-session-count"
        />
        <Metric
          icon={<ClipboardCheck className="h-3 w-3" aria-hidden />}
          label="출석 관리율"
          value={kpi.totalSessions > 0 ? `${kpi.avgAttendanceManagementRate}%` : "—"}
          testId="academy-coach-operations-attendance-mgmt"
        />
        <Metric
          icon={<ShieldCheck className="h-3 w-3" aria-hidden />}
          label="위험 관리율"
          value={`${kpi.avgAtRiskManagementRate}%`}
          testId="academy-coach-operations-risk-mgmt"
        />
      </div>

      <div
        className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-2.5"
        data-testid="academy-coach-operations-digest"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-800">
          {digest.headline}
        </p>
        <p className="mt-1 text-sm font-bold text-violet-950">{digest.summaryLines.join(" · ")}</p>
      </div>

      {coaches.length > 0 ? (
        <div className="mt-3 space-y-2" data-testid="academy-coach-operations-list">
          {coaches.map((coach) => (
            <div
              key={coach.coachId}
              className="rounded-xl border border-violet-200 bg-white/90 px-3 py-2"
              data-testid={`academy-coach-operations-row-${coach.coachId}`}
            >
              <p className="text-sm font-bold text-violet-950">{coach.coachLabel}</p>
              <p className="mt-0.5 text-[11px] text-violet-800">
                세션 {coach.sessionCount}회 · 출석 관리 {coach.attendanceManagementRate}%
                {coach.avgSessionAttendanceRatePct !== null
                  ? ` · 평균 출석률 ${coach.avgSessionAttendanceRatePct}%`
                  : ""}
                · 위험 선수 {coach.atRiskPlayerCount}명 · 위험 관리 {coach.atRiskManagementRate}%
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className="mt-3 rounded-lg border border-violet-200/80 bg-white/75 p-2.5"
        data-testid="academy-coach-operations-ai-summary"
      >
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-800">
          <Brain className="h-3 w-3" aria-hidden />
          AI 코치 운영 요약
        </p>
        {aiSummary.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-xs leading-relaxed text-violet-950">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
