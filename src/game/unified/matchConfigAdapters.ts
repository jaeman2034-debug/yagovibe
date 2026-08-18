import type { FieldLayoutMode } from "@/lib/live/liveFieldLayout";
import { MATCH_REGISTRY_KEYS } from "./bootstrap/matchRegistryKeys";
import type { UnifiedMatchConfig } from "./types";
import { isValidMatchConfig } from "./types";

/** Phaser registry payload — live 1v1 session (interim until full MatchGameConfig union) */
export type LiveMatchGameConfig = {
  sessionId: string;
  myUid: string;
  isHost: boolean;
  playerIndex: 0 | 1;
  fieldLayoutMode: FieldLayoutMode;
};

export function liveMatchGameConfigToUnified(cfg: LiveMatchGameConfig): UnifiedMatchConfig {
  return {
    sport: "1v1",
    mode: "live",
    sessionId: cfg.sessionId,
  };
}

type RegistryLike = {
  get(key: string): unknown;
};

/** Resolve unified config from Phaser registry — explicit first, live adapter fallback */
export function resolveUnifiedMatchConfigFromRegistry(
  registry: RegistryLike,
): UnifiedMatchConfig | null {
  const explicit = registry.get(MATCH_REGISTRY_KEYS.unifiedMatchConfig) as
    | UnifiedMatchConfig
    | undefined;
  if (explicit?.sport && explicit?.mode && isValidMatchConfig(explicit)) {
    return explicit;
  }

  const liveCfg = registry.get(MATCH_REGISTRY_KEYS.liveMatchConfig) as
    | LiveMatchGameConfig
    | undefined;
  if (liveCfg?.sessionId?.trim()) {
    const derived = liveMatchGameConfigToUnified(liveCfg);
    return isValidMatchConfig(derived) ? derived : null;
  }

  return null;
}
