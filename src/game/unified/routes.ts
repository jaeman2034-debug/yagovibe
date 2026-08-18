/**
 * TRACK 9 entry routes — product URLs (target).
 * Interim: /playground remains alias until 9A cutover.
 */

import type { MatchMode, MatchSport } from "./types";

export function gameSportPath(sport: MatchSport): string {
  return `/game/${sport}`;
}

export function gameSportModePath(sport: MatchSport, mode: MatchMode): string {
  const base = gameSportPath(sport);
  if (mode === "demo") return `${base}?mode=demo`;
  if (mode === "practice") return `${base}?mode=practice`;
  return base;
}

/** Canonical 1v1 live — existing matchmaking flow */
export function game1v1LiveEntryPath(): string {
  return "/game";
}

export function playgroundLegacyPath(): string {
  return "/game/1v1?mode=demo";
}

export function parseGameEntrySearchParams(search: string): {
  mode: MatchMode | null;
} {
  const mode = new URLSearchParams(search).get("mode");
  if (mode === "demo" || mode === "practice" || mode === "live") {
    return { mode };
  }
  return { mode: null };
}
