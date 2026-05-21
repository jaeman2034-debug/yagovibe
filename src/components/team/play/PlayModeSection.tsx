import { useCallback, useEffect, useState } from "react";
import type { PlayPlayerStatsDoc } from "@/utils/playerStats";
import { TRACK } from "@/lib/analytics";
import {
  PLAY_TAB_OPEN_SIMULATION_EVENT,
  PLAY_TAB_PLAYMODE_INTENT_EVENT,
  type PlayTabPlayModeIntent,
  type PlayTabPlayModeIntentDetail,
} from "@/lib/team/teamPlayRoutes";
import PlaySimulationModal from "./PlaySimulationModal";
import { PlayCard } from "./PlayCard";

type Props = {
  teamName?: string;
  simulationRoster: readonly PlayPlayerStatsDoc[];
  teamId?: string | null;
  linkedMatchGameId?: string | null;
  highlightMemberId?: string | null;
};

function dispatchPlayModeIntent(intent: PlayTabPlayModeIntent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PlayTabPlayModeIntentDetail>(PLAY_TAB_PLAYMODE_INTENT_EVENT, {
      detail: { intent },
    })
  );
}

export default function PlayModeSection({
  teamName = "우리 팀",
  simulationRoster,
  teamId = null,
  linkedMatchGameId = null,
  highlightMemberId = null,
}: Props) {
  const [simOpen, setSimOpen] = useState(false);

  useEffect(() => {
    const onOpenSim = () => setSimOpen(true);
    window.addEventListener(PLAY_TAB_OPEN_SIMULATION_EVENT, onOpenSim);
    return () => window.removeEventListener(PLAY_TAB_OPEN_SIMULATION_EVENT, onOpenSim);
  }, []);

  const trackTeam = useCallback(
    (extra?: Record<string, string | number | boolean>) => {
      const tid = teamId?.trim();
      if (!tid) return { ...extra } as Record<string, string | number | boolean>;
      return { team_id: tid, ...extra } as Record<string, string | number | boolean>;
    },
    [teamId]
  );

  const onMatch = useCallback(() => {
    TRACK("CTA_CLICK_RESULT", trackTeam({ via: "play_mode_avatar" }));
    dispatchPlayModeIntent("match");
  }, [trackTeam]);

  const onSimulation = useCallback(() => {
    TRACK("VIEW_SIMULATION", trackTeam());
    dispatchPlayModeIntent("simulation");
  }, [trackTeam]);

  const onGrowth = useCallback(() => {
    TRACK("VIEW_GROWTH", trackTeam());
    dispatchPlayModeIntent("growth");
  }, [trackTeam]);

  return (
    <div id="yago-play-mode-section" className="scroll-mt-28 space-y-3">
      <h4 className="text-sm font-bold text-gray-900">플레이 모드</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PlayCard
          kind="match"
          featured
          icon={<span aria-hidden>⚽</span>}
          title="아바타 경기 시작"
          desc="선택한 종료 경기 기준으로 피드백·반영까지 한 번에 이어가요."
          cta="지금 반영하기"
          onClick={onMatch}
        />
        <PlayCard
          kind="simulation"
          icon={<span aria-hidden>📊</span>}
          title="팀 시뮬레이션 보기"
          desc="현재 카드 전력 기반 스냅샷 결과를 불러옵니다."
          cta="결과 보기"
          onClick={onSimulation}
        />
        <PlayCard
          kind="growth"
          icon={<span aria-hidden>📈</span>}
          title="내 캐릭터 성장 보기"
          desc="경기 피드백으로 반영된 최근 성장 변화를 바로 확인해요."
          cta="성장 보기"
          onClick={onGrowth}
        />
      </div>

      <PlaySimulationModal
        open={simOpen}
        onClose={() => setSimOpen(false)}
        teamName={teamName}
        roster={simulationRoster}
        teamId={teamId}
        linkedMatchGameId={linkedMatchGameId}
        highlightMemberId={highlightMemberId}
      />
    </div>
  );
}
