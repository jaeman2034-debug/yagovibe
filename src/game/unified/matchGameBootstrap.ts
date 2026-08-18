import { prepareOfflinePlaygroundEntry } from "./bootstrap/offlinePlaygroundSession";
import type { MatchMode } from "./types";

/** Offline 1v1 — demo or practice (no RTDB session) */
export type MatchOfflineGameConfig = {
  sport: "1v1";
  mode: Extract<MatchMode, "demo" | "practice">;
};

export function offlineMatchConfigToUnified(cfg: MatchOfflineGameConfig) {
  return {
    sport: cfg.sport,
    mode: cfg.mode,
  } as const;
}

export function playgroundControlModeFromMatchMode(
  mode: Extract<MatchMode, "demo" | "practice">,
): "auto" | "manual" {
  return mode === "demo" ? "auto" : "manual";
}

/** TRACK 9A — React entry sync before Phaser mount (delegates to bootstrap contract) */
export function syncPlaygroundControlFromOfflineMode(
  mode: Extract<MatchMode, "demo" | "practice">,
): void {
  prepareOfflinePlaygroundEntry(mode);
}
