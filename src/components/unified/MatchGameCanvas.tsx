import { useLayoutEffect, useRef } from "react";
import { createOfflineMatchGame } from "@/game/unified/createMatchGame";
import type { MatchGameHandle } from "@/game/unified/createMatchGame";
import {
  applyMatchPhaserCanvasStyles,
  isMatchPhaserHostSized,
  MATCH_PHASER_HOST_STYLE,
  matchPhaserHostClassName,
} from "@/game/unified/shell";
import "@/game/unified/shell/match-phaser-host.css";
import type { MatchGameCanvasProps } from "./matchCanvasTypes";

export type { MatchGameCanvasProps } from "./matchCanvasTypes";

/**
 * Offline 1v1 Phaser mount — demo/practice only.
 * Scene start ownership: createOfflineMatchGame → MatchScene → PlaygroundScene.
 */
export function MatchGameCanvas({ className, sport = "1v1", mode }: MatchGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<MatchGameHandle | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const resizeGame = () => {
      const game = gameRef.current?.game;
      if (!game) return;
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      game.scale.resize(w, h);
    };

    const mountGame = () => {
      if (gameRef.current) return true;
      if (!isMatchPhaserHostSized(host)) return false;

      gameRef.current = createOfflineMatchGame(host, { sport, mode });
      applyMatchPhaserCanvasStyles(host);
      resizeGame();
      return true;
    };

    const ro = new ResizeObserver(() => {
      if (!mountGame()) return;
      resizeGame();
    });

    ro.observe(host);
    mountGame();

    if (import.meta.env.hot) {
      import.meta.env.hot.accept(
        [
          "@/game/unified/createMatchGame.ts",
          "@/game/unified/MatchScene.ts",
          "@/game/playground/PlaygroundScene.ts",
          "@/game/playground/playgroundFieldBounds.ts",
          "@/game/playground/playgroundDemoMode.ts",
          "@/game/playground/playgroundAutoDemo.ts",
          "@/game/unified/modules/goal/goalFx.ts",
          "@/game/unified/modules/goal/goalFeedback.ts",
        ],
        () => {
          gameRef.current?.destroy();
          gameRef.current = null;
          mountGame();
        },
      );
    }

    return () => {
      ro.disconnect();
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [sport, mode]);

  return (
    <div
      ref={hostRef}
      className={matchPhaserHostClassName(className)}
      style={MATCH_PHASER_HOST_STYLE}
      aria-hidden
    />
  );
}
