import { usePlayerIntelligenceView } from "@/components/vision/player/PlayerIntelligenceProvider";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";

export function PlayerPlaymakerContributionCard() {
  const { state, view } = usePlayerIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const empty = state.status === "ready" && view != null && !view.vision.hasAnalysis;

  return (
    <VisionCardFrame
      title="Playmaker Contribution"
      testId="player-intelligence-playmaker"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Playmaker 분석 데이터가 없습니다."
    >
      {view?.vision.hasAnalysis ? (
        <div>
          <p className="text-lg font-black text-violet-950">
            {view.playmaker.isPlaymaker ? "Playmaker" : "Support"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-violet-900">
            {view.playmaker.contributionLabel}
          </p>
          {view.playmaker.score != null ? (
            <p className="mt-2 text-sm font-bold tabular-nums text-violet-800">
              연결 점수 {Math.round(view.playmaker.score * 100)}%
            </p>
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
