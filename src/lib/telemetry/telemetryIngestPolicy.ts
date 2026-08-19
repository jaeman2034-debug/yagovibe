/**
 * TRACK 2 Phase 2 — which event types may be emitted (rollout flags).
 * Contract: docs/TRACK2_PHASE2_TELEMETRY_CONTRACT.md
 */
import type { MatchEventType } from "./matchEventTypes";

/** Phase 1 production ingest */
export const TELEMETRY_TIER_P0: readonly MatchEventType[] = [
  "MATCH_STARTED",
  "KICK_ATTEMPT",
  "GOAL",
  "MATCH_ENDED",
] as const;

/** Phase 2A — pass + defensive transition */
export const TELEMETRY_TIER_P1: readonly MatchEventType[] = [
  "PASS_ATTEMPT",
  "PASS_COMPLETE",
  "PASS_SUCCESS",
  "INTERCEPTION",
] as const;

/** Phase 2A — possession boundary */
export const TELEMETRY_TIER_P2: readonly MatchEventType[] = [
  "BALL_LOST",
  "OUT_OF_PLAY",
  "BALL_TOUCH",
] as const;

/** Phase 2A — spatial stream (throttled) */
export const TELEMETRY_TIER_P3: readonly MatchEventType[] = ["POSITION_SAMPLE"] as const;

export const POSITION_SAMPLE_MAX_HZ = 2;

export function isTelemetryEmitEnabled(
  type: MatchEventType,
  flags: { p1?: boolean; p2?: boolean; p3?: boolean } = {},
): boolean {
  if ((TELEMETRY_TIER_P0 as readonly string[]).includes(type)) return true;
  if (flags.p1 && (TELEMETRY_TIER_P1 as readonly string[]).includes(type)) return true;
  if (flags.p2 && (TELEMETRY_TIER_P2 as readonly string[]).includes(type)) return true;
  if (flags.p3 && (TELEMETRY_TIER_P3 as readonly string[]).includes(type)) return true;
  return false;
}

/** Pass-complete aliases for replay / chain detection */
export const PASS_COMPLETE_EVENT_TYPES = ["PASS_COMPLETE", "PASS_SUCCESS"] as const;

export function isPassCompleteEventType(type: string): boolean {
  return (PASS_COMPLETE_EVENT_TYPES as readonly string[]).includes(type);
}
