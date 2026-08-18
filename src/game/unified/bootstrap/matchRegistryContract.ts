import type { LiveMatchGameConfig } from "@/game/unified/matchConfigAdapters";
import {
  playgroundControlModeFromMatchMode,
  type MatchOfflineGameConfig,
} from "@/game/unified/matchGameBootstrap";
import type { UnifiedMatchConfig } from "@/game/unified/types";
import { isValidMatchConfig } from "@/game/unified/types";
import { setPlaygroundControlMode } from "@/game/playground/playgroundDemoMode";
import { MATCH_REGISTRY_KEYS } from "./matchRegistryKeys";

type RegistryLike = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
};

/** Writers — React bootstrap + Phaser preBoot only */
export function writeOfflineUnifiedRegistry(
  registry: RegistryLike,
  cfg: MatchOfflineGameConfig,
): UnifiedMatchConfig {
  const unified: UnifiedMatchConfig = { sport: cfg.sport, mode: cfg.mode };
  registry.set(MATCH_REGISTRY_KEYS.unifiedMatchConfig, unified);
  return unified;
}

export function writeLiveMatchRegistry(
  registry: RegistryLike,
  unified: UnifiedMatchConfig,
  live: LiveMatchGameConfig,
): void {
  registry.set(MATCH_REGISTRY_KEYS.unifiedMatchConfig, unified);
  registry.set(MATCH_REGISTRY_KEYS.liveMatchConfig, live);
  registry.set(MATCH_REGISTRY_KEYS.fieldLayoutMode, live.fieldLayoutMode);
}

/** Readers — MatchScene + modules */
export function readUnifiedMatchConfig(registry: RegistryLike): UnifiedMatchConfig | null {
  const raw = registry.get(MATCH_REGISTRY_KEYS.unifiedMatchConfig) as UnifiedMatchConfig | undefined;
  if (!raw || !isValidMatchConfig(raw)) return null;
  return raw;
}

/** Idempotent — MatchScene may call after React entry sync */
export function ensurePlaygroundControlFromConfig(config: UnifiedMatchConfig): void {
  if (config.mode !== "demo" && config.mode !== "practice") return;
  setPlaygroundControlMode(playgroundControlModeFromMatchMode(config.mode));
}
