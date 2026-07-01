import type { ReactNode } from "react";
import { Brain, CalendarDays, ClipboardList, Loader2, Percent, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcademySessionIntelligenceResult } from "@/lib/ai-growth/academySessionIntelligenceTypes";

type Props = {
  intelligence: AcademySessionIntelligenceResult | null;
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
      className="flex flex-col items-center rounded-xl border border-sky-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-sky-800">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-black tabular-nums text-sky-950">{value}</p>
    </div>
  );
}

/** Sprint F-2.2-c — 아카데미 세션 인텔리전스 */
export function AcademySessionDashboardCard({
  intelligence,
  loading = false,
  className,
}: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900",
          className
        )}
        data-testid="academy-session-dashboard-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        세션 인텔리전스 집계 중…
      </div>
    );
  }

  if (!intelligence) return null;

  const { kpi, recentSessions, digest, aiSummary, isEmpty } = intelligence;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 via-white to-blue-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="academy-session-dashboard-card"
      data-empty={isEmpty ? "true" : "false"}
      aria-label="세션 인텔리전스"
    >
      <h3 className="text-sm font-black text-sky-950">{intelligence.headline}</h3>
      {isEmpty ? (
        <p
          className="mt-1 text-[11px] leading-relaxed text-sky-800"
          data-testid="academy-session-dashboard-empty"
        >
          훈련 세션을 생성하면 세션 운영·출석률 요약이 표시됩니다.
        </p>
      ) : null}

      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
        data-testid="academy-session-dashboard-metrics"
      >
        <Metric
          icon={<CalendarDays className="h-3 w-3" aria-hidden />}
          label="최근 세션"
          value={kpi.totalSessions}
          testId="academy-session-total-count"
        />
        <Metric
          icon={<Percent className="h-3 w-3" aria-hidden />}
          label="평균 출석률"
          value={
            kpi.avgSessionAttendanceRatePct !== null
              ? `${kpi.avgSessionAttendanceRatePct}%`
              : "—"
          }
          testId="academy-session-avg-attendance"
        />
        <Metric
          icon={<ClipboardList className="h-3 w-3" aria-hidden />}
          label="저출석 세션"
          value={kpi.lowAttendanceSessionCount}
          testId="academy-session-low-attendance"
        />
        <Metric
          icon={<XCircle className="h-3 w-3" aria-hidden />}
          label="출석 미기록"
          value={kpi.unrecordedSessionCount}
          testId="academy-session-unrecorded"
        />
      </div>

      <div
        className="mt-3 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2.5"
        data-testid="academy-session-digest"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">
          {digest.headline}
        </p>
        <p className="mt-1 text-sm font-bold text-sky-950">{digest.summaryLines.join(" · ")}</p>
      </div>

      {recentSessions.length > 0 ? (
        <div className="mt-3 space-y-2" data-testid="academy-session-list">
          {recentSessions.map((session) => (
            <div
              key={session.sessionId}
              className="rounded-xl border border-sky-200 bg-white/90 px-3 py-2"
              data-testid={`academy-session-row-${session.sessionId}`}
            >
              <p className="text-sm font-bold text-sky-950">{session.title}</p>
              <p className="mt-0.5 text-[11px] text-sky-800">
                {session.weekLabel} · {session.status}
                {session.attendanceRatePct !== null
                  ? ` · 출석률 ${session.attendanceRatePct}%`
                  : " · 출석 미기록"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className="mt-3 rounded-lg border border-sky-200/80 bg-white/75 p-2.5"
        data-testid="academy-session-ai-summary"
      >
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-sky-800">
          <Brain className="h-3 w-3" aria-hidden />
          AI 세션 요약
        </p>
        {aiSummary.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-xs leading-relaxed text-sky-950">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
