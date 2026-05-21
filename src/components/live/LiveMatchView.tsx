import { useCallback } from "react";
import { useLiveMatchSession } from "@/hooks/useLiveMatchSession";
import { LiveMatchCanvas } from "./LiveMatchCanvas";
import { LiveMatchOverlay } from "./LiveMatchOverlay";
import { LiveMatchRotateHint } from "./LiveMatchRotateHint";

type Props = {
  sessionId: string;
  myUid: string;
  playerUids: string[];
  matchId?: string;
};

export function LiveMatchView({ sessionId, myUid, playerUids, matchId }: Props) {
  const live = useLiveMatchSession({ sessionId, myUid, playerUids });

  const onToggleReady = useCallback(() => {
    live.toggleReady();
  }, [live.toggleReady]);

  if (live.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] px-4 text-center text-sm text-rose-300">
        {live.error}
      </div>
    );
  }

  if (!live.ready || !live.fieldLayoutMode || !live.bridgeReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-sm text-slate-400">
        라이브 세션 연결 중…
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full flex-1 overflow-hidden bg-[#070b14]">
      <LiveMatchCanvas
        className="absolute inset-0 h-full w-full"
        sessionId={sessionId}
        myUid={myUid}
        isHost={live.isHost}
        playerIndex={live.playerIndex}
        fieldLayoutMode={live.fieldLayoutMode}
      />
      <LiveMatchRotateHint />
      <LiveMatchOverlay
        sessionId={sessionId}
        snapshot={live.snapshot}
        myUid={myUid}
        opponentUid={live.opponentUid}
        matchId={matchId}
        localReady={live.localReady}
        onToggleReady={onToggleReady}
        isHost={live.isHost}
        fieldLayoutMode={live.fieldLayoutMode}
        playerIndex={live.playerIndex}
      />
    </div>
  );
}
