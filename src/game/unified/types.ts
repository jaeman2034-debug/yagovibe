/** TRACK 9 — Unified Gameplay Platform config types */

export type MatchSport = "1v1" | "5v5" | "8v8";

export type MatchMode = "demo" | "practice" | "live";

/** Runtime scene + route entry contract */
export type UnifiedMatchConfig = {
  sport: MatchSport;
  mode: MatchMode;
  /** live/practice session — required when mode === "live" */
  sessionId?: string;
};

export type MatchInputSource = "scripted" | "local" | "network";

export type MatchScoringPolicy = "scripted" | "practice_reset" | "official";

export type MatchAiPolicy = "choreography" | "assist" | "none";

/** Resolved capabilities — scenes must not branch on raw mode strings ad hoc */
export type MatchBehavior = {
  config: UnifiedMatchConfig;
  input: MatchInputSource;
  scoring: MatchScoringPolicy;
  networking: boolean;
  ai: MatchAiPolicy;
  /** Client-only XP trial (showcase) — not server authoritative */
  clientXpTrial: boolean;
  /** Emit match telemetry events (TRACK 1) */
  telemetry: boolean;
  /** Auto demo loop after goal (demo mode) */
  autoDemoLoop: boolean;
  /** User manual controls enabled */
  manualInput: boolean;
};

export function isValidMatchConfig(config: UnifiedMatchConfig): boolean {
  if (config.mode === "live" && !config.sessionId?.trim()) return false;
  return config.sport === "1v1" || config.sport === "5v5" || config.sport === "8v8";
}
