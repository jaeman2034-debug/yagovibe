import type { ReactNode } from "react";
import {
  AlertTriangle,
  Brain,
  CalendarCheck,
  Clock,
  Loader2,
  UserX,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcademyAttendanceIntelligenceResult } from "@/lib/ai-growth/academyAttendanceIntelligenceTypes";

type Props = {
  intelligence: AcademyAttendanceIntelligenceResult | null;
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
      className="flex flex-col items-center rounded-xl border border-teal-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-teal-800">
        {icon}
        {label}
      </div>
      <p className={cn("mt-0.5 text-lg font-black tabular-nums", accent)}>{value}</p>
    </div>
  );
}

/** Sprint F-2.1-c — 아카데미 출석 인텔리전스 대시보드 */
export function AcademyAttendanceDashboardCard({
  intelligence,
  loading = false,
  className,
}: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-900",
          className
        )}
        data-testid="academy-attendance-dashboard-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        출석 인텔리전스 집계 중…
      </div>
    );
  }

  if (!intelligence) return null;

  const { kpi, atRiskPlayers, digest, aiSummary, isEmpty } = intelligence;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 via-white to-cyan-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="academy-attendance-dashboard-card"
      data-empty={isEmpty ? "true" : "false"}
      aria-label="출석 인텔리전스"
    >
      <h3 className="text-sm font-black text-teal-950">{intelligence.headline}</h3>
      {isEmpty ? (
        <p
          className="mt-1 text-[11px] leading-relaxed text-teal-800"
          data-testid="academy-attendance-dashboard-empty"
        >
          세션 출석을 기록하면 출석률·위험 선수·운영 요약이 표시됩니다.
        </p>
      ) : null}

      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"
        data-testid="academy-attendance-dashboard-metrics"
      >
        <Metric
          icon={<CalendarCheck className="h-3 w-3" aria-hidden />}
          label="출석률"
          value={kpi.avgAttendanceRatePct !== null ? `${kpi.avgAttendanceRatePct}%` : "—"}
          testId="academy-attendance-rate"
          accent="text-teal-900"
        />
        <Metric
          icon={<Clock className="h-3 w-3" aria-hidden />}
          label="지각률"
          value={kpi.avgLateRatePct !== null ? `${kpi.avgLateRatePct}%` : "—"}
          testId="academy-attendance-late-rate"
          accent="text-amber-800"
        />
        <Metric
          icon={<UserX className="h-3 w-3" aria-hidden />}
          label="결석률"
          value={kpi.avgAbsentRatePct !== null ? `${kpi.avgAbsentRatePct}%` : "—"}
          testId="academy-attendance-absent-rate"
          accent="text-rose-800"
        />
        <Metric
          icon={<AlertTriangle className="h-3 w-3" aria-hidden />}
          label="위험 선수"
          value={kpi.atRiskPlayerCount}
          testId="academy-attendance-at-risk-count"
          accent="text-orange-800"
        />
        <Metric
          icon={<Users className="h-3 w-3" aria-hidden />}
          label="연속 결석"
          value={kpi.consecutiveAbsencePlayerCount}
          testId="academy-attendance-consecutive-count"
          accent="text-red-800"
        />
      </div>

      <div
        className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/70 px-3 py-2.5"
        data-testid="academy-attendance-digest"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-800">
          {digest.headline}
        </p>
        <p className="mt-1 text-sm font-bold text-cyan-950">
          {digest.summaryLines.length > 0
            ? digest.summaryLines.join(" · ")
            : "출석 기록 대기 중"}
        </p>
      </div>

      {atRiskPlayers.length > 0 ? (
        <div className="mt-3 space-y-2" data-testid="academy-attendance-risk-list">
          {atRiskPlayers.map((player) => (
            <div
              key={player.playerId}
              className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5"
              data-testid={`academy-attendance-risk-${player.playerId}`}
            >
              <p className="text-sm font-bold text-amber-950">
                {player.playerName}
                <span className="ml-2 text-xs font-semibold text-amber-800">
                  출석률 {player.attendanceRatePct}%
                </span>
              </p>
              <p className="mt-0.5 text-xs font-bold text-amber-800">
                ⚠ {player.riskLabels.join(" · ")}
              </p>
              <p className="mt-1 text-[11px] text-amber-900">
                권장: {player.recommendations.join(" · ")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className="mt-3 rounded-lg border border-teal-200/80 bg-white/75 p-2.5"
        data-testid="academy-attendance-ai-summary"
      >
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">
          <Brain className="h-3 w-3" aria-hidden />
          AI 운영 요약
        </p>
        {aiSummary.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-xs leading-relaxed text-teal-950">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
