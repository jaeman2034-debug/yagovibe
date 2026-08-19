import { useCallback } from "react";
import { useTeamMatchSession } from "@/hooks/useTeamMatchSession";
import type { MatchmakingMode } from "@/lib/matchmaking/types";
import { TeamMatchBridgeContext } from "./TeamMatchBridgeContext";
import { TeamMatchCanvas } from "./TeamMatchCanvas";
import { TeamMatchOverlay } from "./TeamMatchOverlay";

type Props = {
  sessionId: string;
  myUid: string;
  mode: MatchmakingMode;
  playerUids: string[];
  matchId?: string;
};

export function TeamMatchView({ sessionId, myUid, mode, playerUids, matchId }: Props) {
  const team = useTeamMatchSession({ sessionId, myUid, mode, playerUids, matchId });
  const getBridge = useCallback(() => team.bridgeRef.current, [team.bridgeRef]);

  if (team.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] px-4 text-center text-sm text-rose-300">
        {team.error}
      </div>
    );
  }

  if (!team.ready || !team.fieldLayoutMode || !team.bridgeReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#070b14] text-sm text-slate-400">
        <p>팀전 세션 연결 중…</p>
        {import.meta.env.DEV ? (
          <p className="font-mono text-[10px] text-slate-600">
            {mode} · players {playerUids.length}
          </p>
        ) : null}
      </div>
    );
  }

  const bridge = team.bridgeRef.current;

  return (
    <TeamMatchBridgeContext.Provider value={bridge}>
    <div className="relative isolate min-h-[100dvh] h-[100dvh] w-full overflow-hidden bg-[#070b14]">
      <TeamMatchCanvas
        className="absolute inset-0 h-full w-full"
        sessionId={sessionId}
        myUid={myUid}
        hostUid={team.hostUid}
        mode={mode}
        playerUids={playerUids}
        fieldLayoutMode={team.fieldLayoutMode}
        bridge={bridge}
      />
      <TeamMatchOverlay
        sessionId={sessionId}
        mode={mode}
        snapshot={team.hudSnapshot}
        myUid={myUid}
        isHost={team.isHost}
        matchId={matchId}
        fieldLayoutMode={team.fieldLayoutMode}
        bridge={bridge}
        getBridge={getBridge}
      />
    </div>
    </TeamMatchBridgeContext.Provider>
  );
}
