import { cn } from "@/lib/utils";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useVisionCoachDashboard } from "@/components/vision/VisionCoachDashboardProvider";

export function VisionTacticalReportCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();
  const report = view?.tacticalReport ?? null;
  const hasContent = Boolean(
    report?.summary?.trim() ||
      (report?.strengths?.length ?? 0) > 0 ||
      (report?.weaknesses?.length ?? 0) > 0 ||
      (report?.recommendations?.length ?? 0) > 0
  );
  const empty = cardState === "ready" && !hasContent;

  return (
    <VisionCardFrame
      title="Tactical Report"
      testId="vision-tactical-report-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={empty}
      emptyMessage="전술 리포트가 없습니다."
    >
      {report ? (
        <div className="space-y-3 text-xs leading-relaxed">
          {report.summary?.trim() ? (
            <p className={cn("font-semibold", variant === "dark" ? "text-violet-50" : "text-violet-950")}>
              {report.summary.trim()}
            </p>
          ) : null}
          {report.strengths?.length ? (
            <ReportList
              title="Strengths"
              items={report.strengths}
              variant={variant}
              tone="positive"
            />
          ) : null}
          {report.weaknesses?.length ? (
            <ReportList
              title="Weaknesses"
              items={report.weaknesses}
              variant={variant}
              tone="warning"
            />
          ) : null}
          {report.recommendations?.length ? (
            <ReportList
              title="Recommendations"
              items={report.recommendations}
              variant={variant}
              tone="neutral"
            />
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

function ReportList({
  title,
  items,
  variant,
  tone,
}: {
  title: string;
  items: string[];
  variant: "light" | "dark";
  tone: "positive" | "warning" | "neutral";
}) {
  const titleClass =
    tone === "positive"
      ? variant === "dark"
        ? "text-emerald-300"
        : "text-emerald-800"
      : tone === "warning"
        ? variant === "dark"
          ? "text-amber-300"
          : "text-amber-800"
        : variant === "dark"
          ? "text-violet-300"
          : "text-violet-800";

  return (
    <div>
      <p className={cn("text-[10px] font-bold uppercase tracking-wide", titleClass)}>{title}</p>
      <ul className={cn("mt-1 list-disc space-y-0.5 pl-4", variant === "dark" ? "text-violet-100" : "text-violet-900")}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
