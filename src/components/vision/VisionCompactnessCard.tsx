import { cn } from "@/lib/utils";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useVisionCoachDashboard } from "@/components/vision/VisionCoachDashboardProvider";

export function VisionCompactnessCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();
  const score = view?.compactness ?? null;
  const empty = cardState === "ready" && score == null;

  return (
    <VisionCardFrame
      title="Team Compactness"
      testId="vision-compactness-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={empty}
      emptyMessage="Compactness 데이터가 없습니다."
    >
      {score != null ? (
        <div className="flex items-end gap-3">
          <p
            className={cn(
              "text-4xl font-black tabular-nums leading-none",
              variant === "dark" ? "text-white" : "text-violet-950"
            )}
          >
            {score}
          </p>
          <p
            className={cn(
              "pb-1 text-sm font-semibold",
              variant === "dark" ? "text-violet-200" : "text-violet-800"
            )}
          >
            / 100
          </p>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
