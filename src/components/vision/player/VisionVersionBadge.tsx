import { usePlayerIntelligenceView } from "@/components/vision/player/PlayerIntelligenceProvider";
import { cn } from "@/lib/utils";

export function VisionVersionBadge({ className }: { className?: string }) {
  const { state, view } = usePlayerIntelligenceView();

  if (state.status === "loading") {
    return (
      <p className={cn("text-[10px] text-violet-600", className)} data-testid="vision-version-loading">
        버전 정보 불러오는 중…
      </p>
    );
  }

  if (!view) return null;

  const tags = [
    view.version.visionEngine,
    view.version.schema,
    view.version.detectionModel,
    view.version.trackingModel,
    view.version.fiiEngine,
  ];

  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      data-testid="vision-version-badge"
      aria-label="Vision analysis version"
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-violet-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-violet-800"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
