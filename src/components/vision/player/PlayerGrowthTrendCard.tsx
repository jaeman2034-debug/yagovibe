import { usePlayerIntelligenceView } from "@/components/vision/player/PlayerIntelligenceProvider";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";

export function PlayerGrowthTrendCard() {
  const { state, view } = usePlayerIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const empty =
    state.status === "ready" &&
    view != null &&
    view.growth.ovr == null &&
    !view.growth.trendLabel;

  return (
    <VisionCardFrame
      title="Growth Trend"
      testId="player-intelligence-growth"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="성장(OVR) 데이터가 없습니다."
    >
      {view && (view.growth.ovr != null || view.growth.trendLabel) ? (
        <div>
          {view.growth.ovr != null ? (
            <p className="text-3xl font-black tabular-nums text-violet-950">OVR {view.growth.ovr}</p>
          ) : null}
          {view.growth.trendLabel ? (
            <p className="mt-1 text-xs font-bold tabular-nums text-violet-800">{view.growth.trendLabel}</p>
          ) : null}
          <p className="mt-2 text-[11px] text-violet-700">
            훈련 {view.growth.sessionCount}회 · 배지 {view.growth.badgeCount}개
          </p>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
