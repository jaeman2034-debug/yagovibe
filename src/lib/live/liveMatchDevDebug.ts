import { LIVE_MATCH_SCENE_KEY } from "@/game/unified/matchSceneKeys";
import { MATCH_SCENE_KEY } from "@/game/unified/matchSceneKeys";
import {
  assertLiveParityProbe,
  readMatchSceneParityProbe,
  type MatchSceneParityProbe,
} from "@/game/unified/matchSceneParity";
import { getLiveMatchBridge } from "./liveMatchBridge";
import type { LiveMatchBridge } from "./liveMatchBridge";
import type { LiveBallState } from "./liveMatchTypes";

const LIVE_SCENE_KEYS = [MATCH_SCENE_KEY, LIVE_MATCH_SCENE_KEY] as const;

export type LiveBootstrapProbe = {
  canvasW: number;
  canvasH: number;
  bridgeType: string;
  sceneReady: boolean;
  canvasCount: number;
  tag: string;
  matchParity?: MatchSceneParityProbe;
  matchParityFailures?: string[];
};

function isLiveSceneReady(): boolean {
  const games = (window as Window & { Phaser?: { GAMES?: Array<{ scene: { getScene: (k: string) => unknown } }> } }).Phaser?.GAMES;
  if (!games?.length) return false;
  for (const game of games) {
    for (const sceneKey of LIVE_SCENE_KEYS) {
      const scene = game.scene.getScene(sceneKey) as {
        registry?: { get: (key: string) => unknown };
        sys?: { settings?: { status?: number } };
      } | null;
      if (!scene) continue;
      if (scene.registry?.get("liveMatchReady") === true) return true;
      if (scene.sys?.settings?.status === 4) return true;
    }
  }
  return false;
}

/** DEV: 콘솔 3줄 판별과 동일 — `window.__LIVE_BOOTSTRAP__()` */
export function readLiveMatchBootstrapProbe(): LiveBootstrapProbe {
  const canvas = document.querySelector(".live-match-phaser-host canvas") as HTMLCanvasElement | null;
  const bridge =
    (window as Window & { __LIVE_BRIDGE__?: () => LiveMatchBridge | null }).__LIVE_BRIDGE__?.() ??
    getLiveMatchBridge();
  const parity = readMatchSceneParityProbe();
  const parityFailures = parity.found ? assertLiveParityProbe(parity) : ["MatchScene not bootstrapped"];
  return {
    canvasW: canvas?.width ?? 0,
    canvasH: canvas?.height ?? 0,
    bridgeType: typeof bridge,
    sceneReady: isLiveSceneReady(),
    canvasCount: document.querySelectorAll("canvas").length,
    tag: "probe",
    matchParity: parity,
    matchParityFailures: parityFailures,
  };
}

export function logLiveMatchBootstrapProbe(tag: string, extra?: Record<string, unknown>): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const probe = { ...readLiveMatchBootstrapProbe(), tag, ...extra };
  const w = window as Window & {
    __LIVE_BOOTSTRAP__?: () => LiveBootstrapProbe;
    __MATCH_PARITY__?: () => MatchSceneParityProbe;
  };
  w.__LIVE_BOOTSTRAP__ = readLiveMatchBootstrapProbe;
  w.__MATCH_PARITY__ = readMatchSceneParityProbe;
  console.info("[LIVE BOOTSTRAP]", probe);
}

export type LiveMatchDevDebugPayload = {
  sessionId: string;
  myUid: string;
  isHost: boolean;
  playerIndex: 0 | 1;
  snapshotBall: LiveBallState;
  bridgeBall: LiveBallState;
  spriteBall?: { x: number; y: number; visible: boolean; alpha: number; depth: number };
  spriteLocal?: { x: number; y: number };
  spriteRemote?: { x: number; y: number };
  layoutKickoff?: { local: { x: number; y: number }; remote: { x: number; y: number } };
  matchPhase: string;
  canvasCount: number;
};

/** DEV: `window.__LIVE_DEBUG__` — Guest ball ingest·sprite 위치 확인 */
export function syncLiveMatchDevDebug(
  bridge: LiveMatchBridge | null,
  extras?: {
    spriteBall?: LiveMatchDevDebugPayload["spriteBall"];
    spriteLocal?: LiveMatchDevDebugPayload["spriteLocal"];
    spriteRemote?: LiveMatchDevDebugPayload["spriteRemote"];
    layoutKickoff?: LiveMatchDevDebugPayload["layoutKickoff"];
  },
): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  const w = window as Window & { __LIVE_DEBUG__?: LiveMatchDevDebugPayload };

  if (!bridge) {
    w.__LIVE_DEBUG__ = undefined;
    const wClear = w as Window & { __LIVE_BRIDGE__?: () => LiveMatchBridge | null };
    wClear.__LIVE_BRIDGE__ = undefined;
    return;
  }

  w.__LIVE_DEBUG__ = {
    sessionId: bridge.sessionId,
    myUid: bridge.myUid,
    isHost: bridge.isHost,
    playerIndex: bridge.playerIndex,
    snapshotBall: { ...bridge.snapshot.ball },
    bridgeBall: { ...bridge.snapshot.ball },
    matchPhase: bridge.snapshot.match.phase,
    spriteBall: extras?.spriteBall,
    spriteLocal: extras?.spriteLocal,
    spriteRemote: extras?.spriteRemote,
    layoutKickoff: extras?.layoutKickoff,
    canvasCount: document.querySelectorAll("canvas").length,
  };

  const wBridge = w as Window & {
    __LIVE_BRIDGE__?: () => LiveMatchBridge | null;
  };
  wBridge.__LIVE_BRIDGE__ = () => bridge;
  logLiveMatchBootstrapProbe("bridge-sync");
}
