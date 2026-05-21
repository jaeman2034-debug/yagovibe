import { useEffect, useRef } from "react";
import type { FieldLayoutMode } from "@/lib/live/liveFieldLayout";
import {
  createLiveMatchGame,
  type LiveMatchGameHandle,
} from "@/game/live/createLiveMatchGame";

type Props = {
  className?: string;
  sessionId: string;
  myUid: string;
  isHost: boolean;
  playerIndex: 0 | 1;
  fieldLayoutMode: FieldLayoutMode;
};

export function LiveMatchCanvas({
  className,
  sessionId,
  myUid,
  isHost,
  playerIndex,
  fieldLayoutMode,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<LiveMatchGameHandle | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !myUid) return;

    const handle = createLiveMatchGame(host, {
      sessionId,
      myUid,
      isHost,
      playerIndex,
      fieldLayoutMode,
    });
    gameRef.current = handle;

    return () => {
      handle.destroy();
      gameRef.current = null;
    };
  }, [sessionId, myUid, isHost, playerIndex, fieldLayoutMode]);

  return <div ref={hostRef} className={className} aria-hidden />;
}
