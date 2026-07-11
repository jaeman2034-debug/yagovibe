import { cn } from "@/lib/utils";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { usePlayerIntelligenceView } from "@/components/vision/player/PlayerIntelligenceProvider";

export function PlayerIntelligenceSummaryCard() {
  const { state, view } = usePlayerIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const empty = state.status === "empty";

  return (
    <VisionCardFrame
      title="Player Summary"
      testId="player-intelligence-summary"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage={state.status === "empty" ? state.message : "요약 없음"}
    >
      {view ? (
        <div className="space-y-2">
          <p className="text-sm font-black text-violet-950">{view.summary.headline}</p>
          {view.summary.matchLabel ? (
            <p className="text-xs font-medium text-violet-800">경기: {view.summary.matchLabel}</p>
          ) : null}
          <p className="text-xs leading-relaxed text-violet-900/90">{view.recommendation}</p>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
