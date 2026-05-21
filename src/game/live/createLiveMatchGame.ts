import Phaser from "phaser";
import type { FieldLayoutMode } from "@/lib/live/liveFieldLayout";
import { LiveMatchScene } from "./LiveMatchScene";
import { getLiveMatchBridge } from "@/lib/live/liveMatchBridge";
import { clearLiveMatchMove } from "@/lib/live/liveMatchInput";

export type LiveMatchGameHandle = {
  game: Phaser.Game;
  destroy: () => void;
};

export type LiveMatchGameConfig = {
  sessionId: string;
  myUid: string;
  isHost: boolean;
  playerIndex: 0 | 1;
  fieldLayoutMode: FieldLayoutMode;
};

export function createLiveMatchGame(
  parent: HTMLElement,
  config: LiveMatchGameConfig,
): LiveMatchGameHandle {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#070b14",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [LiveMatchScene],
    audio: { noAudio: true },
    fps: { target: 60, forceSetTimeOut: true },
  });

  game.registry.set("fieldLayoutMode", config.fieldLayoutMode);
  game.registry.set("liveMatchConfig", config);

  return {
    game,
    destroy: () => {
      clearLiveMatchMove(getLiveMatchBridge()?.sessionId);
      game.destroy(true);
    },
  };
}
