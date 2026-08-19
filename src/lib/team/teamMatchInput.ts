import { auth } from "@/lib/firebase";
import type { TeamMatchBridge } from "./teamMatchBridge";

function normalizeMove(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len > 1) return { x: x / len, y: y / len };
  return { x, y };
}

function assertBridge(sessionId: string, bridge: TeamMatchBridge | null | undefined): TeamMatchBridge | null {
  if (!bridge) {
    if (import.meta.env.DEV) {
      console.warn("[TEAM INPUT] bridge required — pass bridgeRef from TeamMatchView");
    }
    return null;
  }
  const sid = sessionId.trim();
  if (!sid || bridge.sessionId !== sid) return null;
  const authUid = auth.currentUser?.uid?.trim() ?? "";
  if (authUid && bridge.authUid !== authUid) {
    if (import.meta.env.DEV) {
      console.error("[TEAM INPUT] blocked — bridge.authUid !== auth.uid", {
        bridgeAuthUid: bridge.authUid.slice(0, 8),
        authUid: authUid.slice(0, 8),
        bridgeId: bridge.id,
      });
    }
    return null;
  }
  return bridge;
}

/** Context·useRef bridge 필수 — global lookup 금지 */
export function setTeamMatchMove(
  sessionId: string,
  x: number,
  y: number,
  bridge: TeamMatchBridge | null | undefined,
): void {
  const b = assertBridge(sessionId, bridge);
  if (!b) return;

  const prev = { x: b.moveInput.x, y: b.moveInput.y };
  const next = normalizeMove(x, y);
  b.moveInput.x = next.x;
  b.moveInput.y = next.y;
  if (import.meta.env.DEV && Math.hypot(b.moveInput.x, b.moveInput.y) > 0.05) {
    const changed = Math.hypot(b.moveInput.x - prev.x, b.moveInput.y - prev.y) > 0.08;
    if (changed) {
      console.log("[TEAM INPUT] joystick", {
        sessionId: sessionId.slice(0, 8),
        bridgeMyUid: b.myUid.slice(0, 8),
        move: { ...b.moveInput },
        bridgeId: b.sessionId.slice(0, 8),
      });
    }
  }
}

export function clearTeamMatchMove(
  sessionId: string,
  bridge: TeamMatchBridge | null | undefined,
): void {
  const b = assertBridge(sessionId, bridge);
  if (!b) return;
  b.moveInput.x = 0;
  b.moveInput.y = 0;
}
