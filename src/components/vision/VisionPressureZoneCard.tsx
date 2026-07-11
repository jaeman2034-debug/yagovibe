import { cn } from "@/lib/utils";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useVisionCoachDashboard } from "@/components/vision/VisionCoachDashboardProvider";

export function VisionPressureZoneCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();
  const zones = view?.pressureZones ?? [];
  const empty = cardState === "ready" && zones.length === 0;

  return (
    <VisionCardFrame
      title="Pressure Zone"
      testId="vision-pressure-zone-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={empty}
      emptyMessage="Pressure Zone 데이터가 없습니다."
    >
      <ul className="space-y-2">
        {zones.map((zone) => {
          const pct = Math.round(zone.intensity * 100);
          return (
            <li key={zone.zoneId}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={cn(
                    "font-semibold",
                    variant === "dark" ? "text-violet-100" : "text-violet-950"
                  )}
                >
                  {zone.label}
                </span>
                <span
                  className={cn(
                    "font-black tabular-nums",
                    variant === "dark" ? "text-violet-200" : "text-violet-800"
                  )}
                >
                  {pct}%
                </span>
              </div>
              <div
                className={cn(
                  "mt-1 h-1.5 overflow-hidden rounded-full",
                  variant === "dark" ? "bg-black/30" : "bg-violet-100"
                )}
              >
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </VisionCardFrame>
  );
}
