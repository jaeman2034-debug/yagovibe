import { LiveMatchScene } from "@/game/live/LiveMatchScene";
import { resolveMatchBehavior } from "./behaviorMatrix";
import { resolveUnifiedMatchConfigFromRegistry } from "./matchConfigAdapters";
import { buildMatchSceneParityStamp } from "./matchSceneParity";
import { MATCH_SCENE_KEY } from "./matchSceneKeys";
import type { MatchBehavior, UnifiedMatchConfig } from "./types";
import {
  MATCH_REGISTRY_KEYS,
  routeMatchSceneToOfflinePlayground,
} from "./bootstrap";

export { MATCH_SCENE_KEY } from "./matchSceneKeys";

/**
 * TRACK 9A unified shell — config + behavior resolution, then mode driver.
 * live 1v1 → LiveMatchScene (super.create)
 * demo/practice → PlaygroundScene (routeMatchSceneToOfflinePlayground)
 */
export class MatchScene extends LiveMatchScene {
  private unifiedConfig!: UnifiedMatchConfig;
  private matchBehavior!: MatchBehavior;

  constructor() {
    super(MATCH_SCENE_KEY);
  }

  create(): void {
    const config = resolveUnifiedMatchConfigFromRegistry(this.registry);
    if (!config) {
      console.error("[MatchScene] invalid unified config — abort", config);
      return;
    }

    this.unifiedConfig = config;
    this.matchBehavior = resolveMatchBehavior(config);
    this.registry.set(MATCH_REGISTRY_KEYS.unifiedMatchConfig, config);
    this.registry.set(MATCH_REGISTRY_KEYS.matchBehavior, this.matchBehavior);

    if (config.sport !== "1v1") {
      console.error("[MatchScene] team driver not ready — use TeamMatchScene (9B+)", config.sport);
      return;
    }

    if (config.mode === "demo" || config.mode === "practice") {
      if (import.meta.env.DEV) {
        console.info("[MatchScene] offline 1v1 driver", {
          mode: config.mode,
          input: this.matchBehavior.input,
          scoring: this.matchBehavior.scoring,
          autoDemoLoop: this.matchBehavior.autoDemoLoop,
        });
      }
      routeMatchSceneToOfflinePlayground(this, config);
      return;
    }

    if (config.mode !== "live") {
      console.error("[MatchScene] unsupported mode", config.mode);
      return;
    }

    if (import.meta.env.DEV) {
      console.info("[MatchScene] live 1v1 driver", {
        sessionId: config.sessionId?.slice(0, 8),
        input: this.matchBehavior.input,
        scoring: this.matchBehavior.scoring,
        networking: this.matchBehavior.networking,
        telemetry: this.matchBehavior.telemetry,
      });
    }

    super.create();

    const liveMatchReady = this.registry.get(MATCH_REGISTRY_KEYS.liveMatchReady) === true;
    const parityStamp = buildMatchSceneParityStamp({
      sceneKey: MATCH_SCENE_KEY,
      unifiedConfig: this.unifiedConfig,
      behavior: this.matchBehavior,
      liveMatchReady,
    });
    this.registry.set(MATCH_REGISTRY_KEYS.matchSceneParity, parityStamp);

    if (import.meta.env.DEV) {
      console.info("[MatchScene] parity stamp", {
        liveMatchReady,
        networking: this.matchBehavior.networking,
        telemetry: this.matchBehavior.telemetry,
      });
    }
  }

  /** Resolved behavior — modules should read via registry or this guard in future extractions */
  protected behavior(): MatchBehavior {
    return this.matchBehavior;
  }
}
