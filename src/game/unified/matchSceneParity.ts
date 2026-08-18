/**
 * TRACK 9A Step 4 — DEV/runtime parity probe for MatchScene → LiveMatchScene delegation.
 * Console: window.__MATCH_PARITY__()
 */

import { LIVE_MATCH_SCENE_KEY, MATCH_SCENE_KEY } from "./matchSceneKeys";
import type { MatchBehavior, UnifiedMatchConfig } from "./types";

export type MatchSceneParityStamp = {
  sceneKey: string;
  unifiedConfig: UnifiedMatchConfig;
  behavior: Pick<MatchBehavior, "input" | "scoring" | "networking" | "telemetry">;
  liveMatchReady: boolean;
  delegatedImplementation: "LiveMatchScene";
  stampedAt: number;
};

export function buildMatchSceneParityStamp(input: {
  sceneKey: string;
  unifiedConfig: UnifiedMatchConfig;
  behavior: MatchBehavior;
  liveMatchReady: boolean;
}): MatchSceneParityStamp {
  return {
    sceneKey: input.sceneKey,
    unifiedConfig: input.unifiedConfig,
    behavior: {
      input: input.behavior.input,
      scoring: input.behavior.scoring,
      networking: input.behavior.networking,
      telemetry: input.behavior.telemetry,
    },
    liveMatchReady: input.liveMatchReady,
    delegatedImplementation: "LiveMatchScene",
    stampedAt: Date.now(),
  };
}

export type MatchSceneParityProbe = {
  found: boolean;
  sceneKey: string | null;
  liveMatchReady: boolean;
  unifiedMode: string | null;
  unifiedSport: string | null;
  networking: boolean | null;
  telemetry: boolean | null;
  stamp: MatchSceneParityStamp | null;
};

const PROBE_SCENE_KEYS = [MATCH_SCENE_KEY, LIVE_MATCH_SCENE_KEY] as const;

/** Scan active Phaser games for MatchScene parity stamp */
export function readMatchSceneParityProbe(): MatchSceneParityProbe {
  const empty: MatchSceneParityProbe = {
    found: false,
    sceneKey: null,
    liveMatchReady: false,
    unifiedMode: null,
    unifiedSport: null,
    networking: null,
    telemetry: null,
    stamp: null,
  };

  if (typeof window === "undefined") return empty;

  const games = (
    window as Window & { Phaser?: { GAMES?: Array<{ scene: { getScene: (k: string) => unknown } }> } }
  ).Phaser?.GAMES;
  if (!games?.length) return empty;

  for (const game of games) {
    for (const sceneKey of PROBE_SCENE_KEYS) {
      const scene = game.scene.getScene(sceneKey) as {
        registry?: { get: (key: string) => unknown };
      } | null;
      if (!scene?.registry) continue;

      const stamp = scene.registry.get("matchSceneParity") as MatchSceneParityStamp | undefined;
      const unified = scene.registry.get("unifiedMatchConfig") as UnifiedMatchConfig | undefined;
      const behavior = scene.registry.get("matchBehavior") as MatchBehavior | undefined;
      const liveMatchReady = scene.registry.get("liveMatchReady") === true;

      if (!stamp && !unified && !liveMatchReady) continue;

      return {
        found: true,
        sceneKey,
        liveMatchReady,
        unifiedMode: unified?.mode ?? stamp?.unifiedConfig.mode ?? null,
        unifiedSport: unified?.sport ?? stamp?.unifiedConfig.sport ?? null,
        networking: behavior?.networking ?? stamp?.behavior.networking ?? null,
        telemetry: behavior?.telemetry ?? stamp?.behavior.telemetry ?? null,
        stamp: stamp ?? null,
      };
    }
  }

  return empty;
}

export function assertLiveParityProbe(probe: MatchSceneParityProbe): string[] {
  const failures: string[] = [];
  if (!probe.found) failures.push("MatchScene not found in Phaser.GAMES");
  if (probe.sceneKey !== MATCH_SCENE_KEY) {
    failures.push(`expected scene key ${MATCH_SCENE_KEY}, got ${probe.sceneKey ?? "null"}`);
  }
  if (probe.unifiedMode !== "live") failures.push(`expected mode live, got ${probe.unifiedMode}`);
  if (probe.unifiedSport !== "1v1") failures.push(`expected sport 1v1, got ${probe.unifiedSport}`);
  if (probe.networking !== true) failures.push("expected networking=true");
  if (probe.telemetry !== true) failures.push("expected telemetry=true");
  if (!probe.liveMatchReady) failures.push("liveMatchReady registry flag false");
  return failures;
}
