import type { MatchEventEmitter } from "./matchEventEmitter";
import type { MatchMode } from "./matchEventTypes";

/** Production-safe telemetry attach snapshot — `window.__YAGO_TELEMETRY__()` in DevTools */
export type TelemetryProdDebugPayload = {
  attached: boolean;
  matchId: string;
  sessionId: string;
  isHost: boolean;
  hookMatchId: string;
  bufferLen: number;
  flags: { started: boolean; ended: boolean };
  /** GameSession hydrate 전 — Page-level SoT */
  source?: "page" | "bridge";
};

export type TelemetryProdDebugFn = (() => TelemetryProdDebugPayload | null) & {
  emitTest?: () => Promise<void>;
};

const BOOTSTRAP_PAYLOAD: TelemetryProdDebugPayload = {
  attached: false,
  matchId: "",
  sessionId: "",
  isHost: false,
  hookMatchId: "",
  bufferLen: 0,
  flags: { started: false, ended: false },
  source: "bootstrap",
};

let activeEmitTest: {
  emitter: MatchEventEmitter;
  sessionId: string;
  matchId: string;
  mode: MatchMode;
  hostUid: string;
} | null = null;

export function registerTelemetryEmitTest(ctx: {
  emitter: MatchEventEmitter;
  sessionId: string;
  matchId: string;
  mode: MatchMode;
  hostUid: string;
} | null): void {
  activeEmitTest = ctx;
}

export async function runTelemetryEmitTest(): Promise<void> {
  if (!activeEmitTest) {
    console.warn("[TELEMETRY] emitTest — no active emitter (host attach with matchId first)");
    return;
  }
  const { emitter, sessionId, matchId, mode, hostUid } = activeEmitTest;
  console.info("[TELEMETRY] emitTest start", {
    sessionId: sessionId.slice(0, 8),
    matchId: matchId.slice(0, 8),
  });
  const before = emitter.bufferMatchEvents().length;
  emitter.emitMatchEvent({
    type: "MATCH_STARTED",
    atMs: 0,
    wallTime: Date.now(),
    payload: {
      mode,
      playerUids: [hostUid],
      startedAt: Date.now(),
      hostUid,
    },
  });
  const afterEmit = emitter.bufferMatchEvents().length;
  /** emit이 void flush()를 띄움 — in-flight flush 결과를 await */
  const result = await emitter.flushMatchEvents();
  console.info("[TELEMETRY] emitTest flush", {
    ...result,
    before,
    afterEmit,
    bufferNow: emitter.bufferMatchEvents().length,
  });
}

function attachEmitTest(fn: TelemetryProdDebugFn): TelemetryProdDebugFn {
  fn.emitTest = () => runTelemetryEmitTest();
  return fn;
}

/** main.tsx — lazy GameSession 청크 로드 전에도 production 콘솔에서 존재 확인 */
export function installTelemetryProdDebugGlobal(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __YAGO_TELEMETRY__?: TelemetryProdDebugFn;
    __YAGO_TELEMETRY_BUILD__?: string;
  };
  w.__YAGO_TELEMETRY_BUILD__ = import.meta.env.VITE_APP_BUILD_ID?.trim() || "telemetry-v1";
  if (typeof w.__YAGO_TELEMETRY__ === "function") return;
  w.__YAGO_TELEMETRY__ = attachEmitTest(() => ({ ...BOOTSTRAP_PAYLOAD }));
}

export function syncTelemetryProdDebug(
  payload: TelemetryProdDebugPayload | null,
): void {
  if (typeof window === "undefined") return;
  installTelemetryProdDebugGlobal();
  const w = window as Window & {
    __YAGO_TELEMETRY__?: TelemetryProdDebugFn;
  };
  if (!payload) {
    w.__YAGO_TELEMETRY__ = attachEmitTest(() => ({ ...BOOTSTRAP_PAYLOAD }));
    return;
  }
  const snap = { ...payload };
  w.__YAGO_TELEMETRY__ = attachEmitTest(() => snap);
}
