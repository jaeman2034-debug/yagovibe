import { callAppendMatchEvents } from "./appendMatchEventsClient";
import { normalizeMatchClockMs, sanitizeMatchEventForWire } from "./matchClock";
import {
  MATCH_EVENT_SCHEMA_VERSION,
  type MatchEventEnvelope,
  type MatchEventPayload,
  type MatchEventType,
  type MatchMode,
  type MatchTeamSide,
} from "./matchEventTypes";

export type MatchEventEmitterOptions = {
  matchId: string;
  sessionId: string;
  mode: MatchMode;
  /** Host-only ingest — guests must not buffer telemetry */
  isHost: () => boolean;
  /** Match clock ms (host authoritative) */
  getMatchClockMs: () => number;
  maxBuffer?: number;
  /** Auto-flush interval; 0 disables periodic flush */
  flushIntervalMs?: number;
};

export type EmitMatchEventArgs<T extends MatchEventType> = {
  type: T;
  payload: MatchEventPayload<T>;
  actorUid?: string;
  teamId?: MatchTeamSide;
  atMs?: number;
  wallTime?: number;
};

const DEFAULT_MAX_BUFFER = 48;
const DEFAULT_FLUSH_INTERVAL_MS = 4000;

export type MatchEventEmitter = {
  emitMatchEvent: <T extends MatchEventType>(args: EmitMatchEventArgs<T>) => void;
  flushMatchEvents: () => Promise<AppendFlushResult>;
  bufferMatchEvents: () => readonly MatchEventEnvelope[];
  dispose: () => void;
  flushAndDispose: () => Promise<AppendFlushResult>;
};

export type AppendFlushResult = {
  flushed: number;
  skipped: boolean;
  error?: string;
};

export function createMatchEventEmitter(options: MatchEventEmitterOptions): MatchEventEmitter {
  const matchId = options.matchId.trim();
  const sessionId = options.sessionId.trim();
  const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER;
  const flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;

  const buffer: MatchEventEnvelope[] = [];
  let flushInFlight: Promise<AppendFlushResult> | null = null;
  let disposed = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  if (flushIntervalMs > 0 && typeof setInterval === "function") {
    intervalId = setInterval(() => {
      if (disposed || buffer.length === 0 || !options.isHost()) return;
      void flushMatchEvents();
    }, flushIntervalMs);
  }

  function buildEnvelope<T extends MatchEventType>(
    args: EmitMatchEventArgs<T>,
  ): MatchEventEnvelope<T> {
    const clockFallback = normalizeMatchClockMs(options.getMatchClockMs(), 0);
    const atMs = normalizeMatchClockMs(args.atMs, clockFallback);
    const wallTime =
      typeof args.wallTime === "number" && Number.isFinite(args.wallTime)
        ? Math.floor(args.wallTime)
        : Date.now();

    return {
      schemaVersion: MATCH_EVENT_SCHEMA_VERSION,
      type: args.type,
      matchId,
      sessionId,
      atMs,
      wallTime,
      actorUid: args.actorUid,
      teamId: args.teamId,
      mode: options.mode,
      payload: args.payload,
    };
  }

  function emitMatchEvent<T extends MatchEventType>(args: EmitMatchEventArgs<T>): void {
    if (disposed || !matchId || !sessionId) return;
    if (!options.isHost()) return;

    buffer.push(buildEnvelope(args));
    console.info("[TELEMETRY EMIT]", args.type, { buffer: buffer.length });

    if (
      args.type === "MATCH_ENDED" ||
      args.type === "GOAL" ||
      args.type === "MATCH_STARTED"
    ) {
      void flushMatchEvents();
      return;
    }
    if (buffer.length >= maxBuffer) {
      void flushMatchEvents();
    }
  }

  function bufferMatchEvents(): readonly MatchEventEnvelope[] {
    return [...buffer];
  }

  async function flushMatchEvents(): Promise<AppendFlushResult> {
    if (!options.isHost()) return { flushed: 0, skipped: true };
    /** MATCH_STARTED 등이 void flush() 한 직후 await flush() 하면 버퍼는 비었지만 in-flight 있음 */
    if (flushInFlight) return flushInFlight;
    if (buffer.length === 0) return { flushed: 0, skipped: false };

    const clockFallback = normalizeMatchClockMs(options.getMatchClockMs(), 0);
    const batch = buffer
      .splice(0, buffer.length)
      .map((e) => sanitizeMatchEventForWire(e, clockFallback));
    console.info(
      "[TELEMETRY FLUSH]",
      batch.length,
      batch.map((e) => ({ type: e.type, atMs: e.atMs })),
    );

    flushInFlight = (async (): Promise<AppendFlushResult> => {
      try {
        const res = await callAppendMatchEvents({ sessionId, events: batch });
        console.info("[TELEMETRY FLUSH OK]", {
          appended: res.appended,
          matchId: res.matchId?.slice(0, 8),
        });
        return { flushed: res.appended, skipped: false };
      } catch (e) {
        if (!disposed) {
          buffer.unshift(...batch);
        }
        const message = e instanceof Error ? e.message : String(e);
        console.warn("[telemetry] flushMatchEvents failed", message);
        return { flushed: 0, skipped: false, error: message };
      } finally {
        flushInFlight = null;
      }
    })();

    return flushInFlight;
  }

  function dispose(): void {
    disposed = true;
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /** Unmount — flush remaining buffer before dispose flag blocks new emits */
  async function flushAndDispose(): Promise<AppendFlushResult> {
    const result = await flushMatchEvents();
    dispose();
    return result;
  }

  return {
    emitMatchEvent,
    flushMatchEvents,
    bufferMatchEvents,
    dispose,
    flushAndDispose,
  };
}
