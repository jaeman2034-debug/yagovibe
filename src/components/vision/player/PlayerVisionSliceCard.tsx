import { usePlayerIntelligenceView } from "@/components/vision/player/PlayerIntelligenceProvider";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";

export function PlayerVisionSliceCard() {
  const { state, view } = usePlayerIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const empty = state.status === "ready" && view != null && !view.vision.hasAnalysis;

  return (
    <VisionCardFrame
      title="Ball Progression · Pressure · Compactness"
      testId="player-intelligence-vision-slice"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Vision 경기 분석이 없습니다."
    >
      {view?.vision.hasAnalysis ? (
        <ul className="space-y-2 text-xs font-semibold text-violet-950">
          {view.vision.forwardPassRate != null ? (
            <li>전방 패스 {Math.round(view.vision.forwardPassRate * 100)}%</li>
          ) : null}
          {view.vision.bestPressureZone ? (
            <li>주요 압박 존: {view.vision.bestPressureZone}</li>
          ) : null}
          {view.vision.compactness != null ? (
            <li>팀 Compactness {view.vision.compactness}%</li>
          ) : null}
        </ul>
      ) : null}
    </VisionCardFrame>
  );
}
