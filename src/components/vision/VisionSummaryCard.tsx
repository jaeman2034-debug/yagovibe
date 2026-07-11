import type { ReactNode } from "react";
import { Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useVisionCoachDashboard } from "@/components/vision/VisionCoachDashboardProvider";

export function VisionSummaryCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();

  const hasContent = Boolean(
    view &&
      (view.recommendation?.trim() ||
        view.playmaker ||
        view.forwardPassRate != null ||
        view.compactness != null)
  );

  return (
    <VisionCardFrame
      title="Vision Summary"
      testId="vision-summary-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={cardState === "ready" && !hasContent}
      emptyMessage="요약할 Vision 지표가 아직 없습니다."
    >
      {view ? (
        <div className="space-y-3">
          {view.recommendation?.trim() ? (
            <p
              className={cn(
                "text-sm font-semibold leading-relaxed",
                variant === "dark" ? "text-violet-50" : "text-violet-950"
              )}
            >
              {view.recommendation.trim()}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {view.playmaker ? (
              <Metric
                icon={<Sparkles className="h-3 w-3" aria-hidden />}
                label="Playmaker"
                value={view.playmaker.name}
                variant={variant}
              />
            ) : null}
            {view.forwardPassRate != null ? (
              <Metric
                icon={<TrendingUp className="h-3 w-3" aria-hidden />}
                label="Forward Pass"
                value={`${Math.round(view.forwardPassRate * 100)}%`}
                variant={variant}
              />
            ) : null}
            {view.compactness != null ? (
              <Metric
                icon={<Users className="h-3 w-3" aria-hidden />}
                label="Compactness"
                value={`${view.compactness}%`}
                variant={variant}
              />
            ) : null}
            {view.pressureZones[0] ? (
              <Metric
                icon={<Target className="h-3 w-3" aria-hidden />}
                label="Top Pressure"
                value={view.pressureZones[0].label}
                variant={variant}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

function Metric({
  icon,
  label,
  value,
  variant,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  variant: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-2 py-2 text-center",
        variant === "dark"
          ? "border-violet-400/25 bg-black/20"
          : "border-violet-200 bg-white/95"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-1 text-[10px] font-medium",
          variant === "dark" ? "text-violet-300" : "text-violet-700"
        )}
      >
        {icon}
        {label}
      </div>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-black tabular-nums",
          variant === "dark" ? "text-white" : "text-violet-950"
        )}
      >
        {value}
      </p>
    </div>
  );
}
