import { usePlayerIntelligenceView } from "@/components/vision/player/PlayerIntelligenceProvider";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";

export function PlayerTacticalSummaryCard() {
  const { state, view } = usePlayerIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const empty =
    state.status === "ready" &&
    view != null &&
    !view.vision.tacticalSummary?.trim() &&
    !view.recommendation.trim();

  return (
    <VisionCardFrame
      title="Tactical Summary"
      testId="player-intelligence-tactical"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="전술 요약이 없습니다."
    >
      {view ? (
        <div className="space-y-2 text-xs leading-relaxed text-violet-950">
          {view.vision.tacticalSummary ? (
            <p className="font-semibold">{view.vision.tacticalSummary}</p>
          ) : null}
          <p>{view.recommendation}</p>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
