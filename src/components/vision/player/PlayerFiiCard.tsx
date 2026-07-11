import { usePlayerIntelligenceView } from "@/components/vision/player/PlayerIntelligenceProvider";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";

export function PlayerFiiCard() {
  const { state, view } = usePlayerIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const empty =
    state.status === "ready" && view != null && view.fii.score == null;

  return (
    <VisionCardFrame
      title="FII"
      testId="player-intelligence-fii"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="이번 경기 FII 데이터가 없습니다."
    >
      {view && view.fii.score != null ? (
        <div>
          <p className="text-4xl font-black tabular-nums text-violet-950">{view.fii.score}</p>
          {view.fii.rank != null ? (
            <p className="mt-1 text-sm font-semibold text-violet-800">
              팀 순위 {view.fii.rank}
              {view.fii.rankTotal != null ? ` / ${view.fii.rankTotal}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
