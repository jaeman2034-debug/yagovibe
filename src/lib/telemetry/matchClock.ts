import type { MatchEventEnvelope, MatchEventType } from "./matchEventTypes";

/** Host match clock — must match functions/src/telemetry/matchEventTypes.ts MAX */
export const MAX_MATCH_CLOCK_MS = 3_600_000;

/** Envelope atMs: finite number in [0, MAX] (never undefined/NaN/string) */
export function normalizeMatchClockMs(value: unknown, fallback = 0): number {
  let n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0) {
    n = typeof fallback === "number" && Number.isFinite(fallback) && fallback >= 0 ? fallback : 0;
  }
  return Math.min(Math.floor(n), MAX_MATCH_CLOCK_MS);
}

function normalizeWallTimeMs(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : Date.now();
}

/** Callable 직전 — JSON 직렬화 후에도 atMs/wallTime 계약 보장 */
export function sanitizeMatchEventForWire<T extends MatchEventType>(
  event: MatchEventEnvelope<T>,
  clockFallback = 0,
): MatchEventEnvelope<T> {
  const atMs = normalizeMatchClockMs(event.atMs, clockFallback);
  const wallTime = normalizeWallTimeMs(event.wallTime);
  let payload = event.payload;

  if (event.type === "KICK_ATTEMPT" && payload && typeof payload === "object") {
    const p = payload as MatchEventEnvelope<"KICK_ATTEMPT">["payload"];
    payload = {
      ...p,
      clockMs: normalizeMatchClockMs(p.clockMs, atMs),
    } as MatchEventEnvelope<T>["payload"];
  }
  if (event.type === "GOAL" && payload && typeof payload === "object") {
    const p = payload as MatchEventEnvelope<"GOAL">["payload"];
    payload = {
      ...p,
      clockMs: normalizeMatchClockMs(p.clockMs, atMs),
    } as MatchEventEnvelope<T>["payload"];
  }

  return {
    ...event,
    atMs,
    wallTime,
    payload,
  };
}
