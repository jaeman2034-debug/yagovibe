import type { LiveMatchBridge } from "./liveMatchBridge";
import { getLiveMatchBridge } from "./liveMatchBridge";

export type LiveMoveInput = { x: number; y: number };

const ZERO_MOVE: LiveMoveInput = { x: 0, y: 0 };

function normalizeMove(x: number, y: number): LiveMoveInput {
  const len = Math.hypot(x, y);
  if (len > 1) {
    return { x: x / len, y: y / len };
  }
  return { x, y };
}

/** bridge.sessionId 비어 있으면 채움. 둘 다 있을 때만 불일치 차단 */
function acceptsSessionInput(bridge: LiveMatchBridge, sessionId: string): boolean {
  const sid = sessionId.trim();
  if (!sid) return false;
  if (!bridge.sessionId?.trim()) {
    bridge.sessionId = sid;
    return true;
  }
  if (bridge.sessionId !== sid) {
    if (import.meta.env.DEV) {
      console.warn("[liveMatch] input blocked — sessionId mismatch", {
        requested: sid.slice(0, 12),
        bridge: bridge.sessionId.slice(0, 12),
      });
    }
    return false;
  }
  return true;
}

/** React 조이스틱 → 현재 세션 bridge.moveInput (모듈 singleton 없음) */
export function setLiveMatchMove(sessionId: string, x: number, y: number): void {
  const bridge = getLiveMatchBridge();
  if (!bridge) return;
  if (!acceptsSessionInput(bridge, sessionId)) return;
  bridge.moveInput = normalizeMove(x, y);
}

export function clearLiveMatchMove(sessionId?: string): void {
  const bridge = getLiveMatchBridge();
  if (!bridge) return;
  if (sessionId?.trim() && bridge.sessionId?.trim() && bridge.sessionId !== sessionId.trim()) {
    return;
  }
  bridge.moveInput = ZERO_MOVE;
}

export function getLiveMatchMove(): LiveMoveInput {
  return getLiveMatchBridge()?.moveInput ?? ZERO_MOVE;
}

export function requestLiveMatchKick(sessionId: string): void {
  const bridge = getLiveMatchBridge();
  if (!bridge) return;
  if (!acceptsSessionInput(bridge, sessionId)) return;
  bridge.pendingLocalKick = true;
}

export function consumeLiveMatchKick(): boolean {
  const bridge = getLiveMatchBridge();
  if (!bridge?.pendingLocalKick) return false;
  bridge.pendingLocalKick = false;
  return true;
}
