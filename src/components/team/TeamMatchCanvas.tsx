import { useEffect, useRef } from "react";
import type { MatchmakingMode } from "@/lib/matchmaking/types";
import type { FieldLayoutMode } from "@/lib/live/liveFieldLayout";
import type { TeamMatchBridge } from "@/lib/team/teamMatchBridge";
import {
  createTeamMatchGame,
  type TeamMatchGameHandle,
} from "@/game/team/createTeamMatchGame";

type Props = {
  className?: string;
  sessionId: string;
  myUid: string;
  hostUid: string;
  mode: MatchmakingMode;
  playerUids: string[];
  fieldLayoutMode: FieldLayoutMode;
  bridge: TeamMatchBridge | null;
};

export function TeamMatchCanvas({
  className,
  sessionId,
  myUid,
  hostUid,
  mode,
  playerUids,
  fieldLayoutMode,
  bridge,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<TeamMatchGameHandle | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !myUid || !bridge) return;

    const handle = createTeamMatchGame(el, {
      sessionId,
      myUid,
      hostUid,
      mode,
      playerUids,
      fieldLayoutMode,
    }, bridge);
    gameRef.current = handle;
    return () => {
      handle.destroy();
      gameRef.current = null;
    };
  }, [sessionId, myUid, hostUid, mode, playerUids.join("|"), fieldLayoutMode, bridge?.id]);

  /** pointer-events:none — DOM 오버레이(조이스틱·Kick)가 Phaser canvas에 가리지 않게 */
  return (
    <div
      ref={hostRef}
      className={className}
      style={{ zIndex: 0, pointerEvents: "none" }}
      aria-hidden
    />
  );
}
