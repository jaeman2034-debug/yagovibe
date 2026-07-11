import { cn } from "@/lib/utils";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useVisionCoachDashboard } from "@/components/vision/VisionCoachDashboardProvider";

export function VisionBallProgressionCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();
  const rate = view?.forwardPassRate ?? null;
  const empty = cardState === "ready" && rate == null;

  return (
    <VisionCardFrame
      title="Ball Progression"
      testId="vision-ball-progression-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={empty}
      emptyMessage="볼 progression 데이터가 없습니다."
    >
      {rate != null ? (
        <div>
          <p
            className={cn(
              "text-3xl font-black tabular-nums",
              variant === "dark" ? "text-white" : "text-violet-950"
            )}
          >
            {Math.round(rate * 100)}%
          </p>
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              variant === "dark" ? "text-violet-200" : "text-violet-800"
            )}
          >
            전방 패스 비율
          </p>
          <div
            className={cn(
              "mt-3 h-2 overflow-hidden rounded-full",
              variant === "dark" ? "bg-black/30" : "bg-violet-100"
            )}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: `${Math.min(100, Math.round(rate * 100))}%` }}
            />
          </div>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
