import { cn } from "@/lib/utils";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useVisionCoachDashboard } from "@/components/vision/VisionCoachDashboardProvider";

export function VisionPlaymakerCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();
  const playmaker = view?.playmaker ?? null;
  const empty = cardState === "ready" && !playmaker;

  return (
    <VisionCardFrame
      title="Playmaker"
      testId="vision-playmaker-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={empty}
      emptyMessage="Playmaker 데이터가 없습니다."
    >
      {playmaker ? (
        <div>
          <p
            className={cn(
              "text-xl font-black",
              variant === "dark" ? "text-white" : "text-violet-950"
            )}
          >
            {playmaker.name}
          </p>
          {playmaker.score != null ? (
            <p
              className={cn(
                "mt-1 text-sm font-semibold tabular-nums",
                variant === "dark" ? "text-violet-200" : "text-violet-800"
              )}
            >
              연결 점수 {Math.round(playmaker.score * 100)}%
            </p>
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
