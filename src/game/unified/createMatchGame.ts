import Phaser from "phaser";
import { clearLiveMatchMove } from "@/lib/live/liveMatchInput";
import { getLiveMatchBridge } from "@/lib/live/liveMatchBridge";
import { PlaygroundScene } from "@/game/playground/PlaygroundScene";
import { MatchScene } from "./MatchScene";
import type { MatchOfflineGameConfig } from "./matchGameBootstrap";
import {
  liveMatchGameConfigToUnified,
  type LiveMatchGameConfig,
} from "./matchConfigAdapters";
import {
  prepareOfflinePlaygroundEntry,
  resetOfflinePlaygroundSessionForMount,
  teardownOfflinePlaygroundPhaserMount,
  writeLiveMatchRegistry,
  writeOfflineUnifiedRegistry,
} from "./bootstrap";

export type MatchGameHandle = {
  game: Phaser.Game;
  destroy: () => void;
};

type SceneClass = new (...args: unknown[]) => Phaser.Scene;

type RegistryBootstrap = (registry: Phaser.Data.DataManager) => void;

function createBaseMatchPhaserGame(
  parent: HTMLElement,
  scenes: SceneClass[],
  bootstrapRegistry?: RegistryBootstrap,
): Phaser.Game {
  const parentW = Math.max(1, parent.clientWidth || window.innerWidth);
  const parentH = Math.max(1, parent.clientHeight || window.innerHeight);

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#070b14",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: parentW,
      height: parentH,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: scenes,
    audio: { noAudio: true },
    fps: { target: 60, forceSetTimeOut: true },
    callbacks: {
      preBoot: (game) => {
        bootstrapRegistry?.(game.registry);
      },
    },
  });
}

/** Unified Phaser bootstrap — live 1v1 (RTDB session). Registry written in preBoot before MatchScene.create. */
export function createMatchGame(
  parent: HTMLElement,
  config: LiveMatchGameConfig,
): MatchGameHandle {
  const unifiedConfig = liveMatchGameConfigToUnified(config);
  const game = createBaseMatchPhaserGame(parent, [MatchScene], (registry) => {
    writeLiveMatchRegistry(registry, unifiedConfig, config);
  });

  return {
    game,
    destroy: () => {
      clearLiveMatchMove(getLiveMatchBridge()?.sessionId);
      game.destroy(true);
    },
  };
}

/** TRACK 9A — demo/practice via MatchScene shell → PlaygroundScene driver */
export function createOfflineMatchGame(
  parent: HTMLElement,
  config: MatchOfflineGameConfig,
): MatchGameHandle {
  resetOfflinePlaygroundSessionForMount();
  prepareOfflinePlaygroundEntry(config.mode);

  const game = createBaseMatchPhaserGame(parent, [MatchScene, PlaygroundScene], (registry) => {
    writeOfflineUnifiedRegistry(registry, config);
  });

  return {
    game,
    destroy: () => {
      teardownOfflinePlaygroundPhaserMount();
      game.destroy(true);
    },
  };
}
