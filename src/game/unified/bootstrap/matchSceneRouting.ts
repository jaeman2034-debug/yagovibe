import { PLAYGROUND_SCENE_KEY } from "@/game/unified/matchSceneKeys";
import { ensurePlaygroundControlFromConfig } from "./matchRegistryContract";
import type { UnifiedMatchConfig } from "@/game/unified/types";

type SceneRouter = {
  scene: { start: (key: string) => void };
};

/**
 * TRACK 9A Phase C-3 — offline demo/practice scene handoff (single owner).
 * MatchScene delegates here; PlaygroundScene is the gameplay driver.
 */
export function routeMatchSceneToOfflinePlayground(
  scene: SceneRouter,
  config: UnifiedMatchConfig,
): void {
  ensurePlaygroundControlFromConfig(config);
  scene.scene.start(PLAYGROUND_SCENE_KEY);
}
