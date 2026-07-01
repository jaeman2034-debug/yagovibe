import type { ReactNode } from "react";
import { AlertTriangle, ClipboardList, Loader2, Percent, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MultiAcademyRiskIntelligenceResult } from "@/lib/ai-growth/multiAcademyRiskIntelligenceTypes";

type Props = {
  intelligence: MultiAcademyRiskIntelligenceResult | null;
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
      className="flex flex-col items-center rounded-xl border border-rose-200 bg-white/95 px-2 py-2 text-center"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-rose-800">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-black tabular-nums text-rose-950">{value}</p>
    </div>
  );
}

function formatPct(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${value}%` : "—";
}

/** Sprint G-1.2 — Multi Academy Risk Intelligence */
export function MultiAcademyRiskIntelligenceCard({
  intelligence,
  loading = false,
  className,
}: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-900",
          className
        )}
        data-testid="multi-academy-risk-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Multi Academy Risk Intelligence 집계 중…
      </div>
    );
  }

  if (!intelligence) return null;

  const { kpi, academies, digest, isEmpty } = intelligence;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-white to-orange-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="multi-academy-risk-card"
      data-empty={isEmpty ? "true" : "false"}
      aria-label="Multi Academy Risk Intelligence"
    >
      <h3 className="text-sm font-black text-rose-950">아카데미 위험 비교</h3>
      {intelligence.subline ? (
        <p className="mt-0.5 text-[11px] text-rose-800">{intelligence.subline}</p>
      ) : null}
      {isEmpty ? (
        <p
          className="mt-1 text-[11px] leading-relaxed text-rose-800"
          data-testid="multi-academy-risk-empty"
        >
          2개 이상 아카데미를 운영하면 위험·운영 지표 비교가 활성화됩니다.
        </p>
      ) : null}

      <div
        className="mt-3 grid grid-cols-3 gap-2"
        data-testid="multi-academy-risk-metrics"
      >
        <Metric
          icon={<ShieldAlert className="h-3 w-3" aria-hidden />}
          label="위험 선수"
          value={formatPct(kpi.avgAtRiskPlayerPct)}
          testId="multi-academy-risk-at-risk-pct"
        />
        <Metric
          icon={<Percent className="h-3 w-3" aria-hidden />}
          label="저출석"
          value={formatPct(kpi.avgLowAttendanceSessionPct)}
          testId="multi-academy-risk-low-attendance-pct"
        />
        <Metric
          icon={<ClipboardList className="h-3 w-3" aria-hidden />}
          label="미기록"
          value={formatPct(kpi.avgUnrecordedSessionPct)}
          testId="multi-academy-risk-unrecorded-pct"
        />
      </div>

      <div
        className="mt-3 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5"
        data-testid="multi-academy-risk-digest"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-rose-800">
          {digest.headline}
        </p>
        <p className="mt-1 text-sm font-bold text-rose-950">{digest.summaryLines.join(" · ")}</p>
      </div>

      {academies.length > 0 ? (
        <div className="mt-3 space-y-2" data-testid="multi-academy-risk-list">
          {academies.map((academy) => (
            <div
              key={academy.teamId}
              className="rounded-xl border border-rose-200 bg-white/90 px-3 py-2"
              data-testid={`multi-academy-risk-row-${academy.teamId}`}
            >
              <p className="flex items-center gap-1 text-sm font-bold text-rose-950">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                {academy.teamName}
              </p>
              <p className="mt-0.5 text-[11px] text-rose-800">
                위험 선수 {formatPct(academy.atRiskPlayerPct)} · 저출석{" "}
                {formatPct(academy.lowAttendanceSessionPct)} · 미기록{" "}
                {formatPct(academy.unrecordedSessionPct)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
