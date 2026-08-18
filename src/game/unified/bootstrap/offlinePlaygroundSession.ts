import { resetPlaygroundInput } from "@/game/playground/playgroundInput";
import {
  clearPlaygroundControlModeListeners,
  setPlaygroundControlMode,
} from "@/game/playground/playgroundDemoMode";
import { resetPlaygroundTrialXp } from "@/game/playground/playgroundXpTrial";
import {
  playgroundControlModeFromMatchMode,
  type MatchOfflineGameConfig,
} from "@/game/unified/matchGameBootstrap";

/**
 * React entry — before Phaser mount (Game1v1Page useLayoutEffect).
 * Writes global control store only; registry written in Phaser preBoot.
 */
export function prepareOfflinePlaygroundEntry(
  mode: MatchOfflineGameConfig["mode"],
): void {
  setPlaygroundControlMode(playgroundControlModeFromMatchMode(mode));
}

/** Phaser mount — reset trial state once per canvas create */
export function resetOfflinePlaygroundSessionForMount(): void {
  resetPlaygroundInput();
  resetPlaygroundTrialXp();
  clearPlaygroundControlModeListeners();
}

/** Phaser unmount / remount — drop listeners + move input, keep trial XP policy unchanged */
export function teardownOfflinePlaygroundPhaserMount(): void {
  resetPlaygroundInput();
  clearPlaygroundControlModeListeners();
}
