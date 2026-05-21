import { auth } from "@/lib/firebase";
import type { LiveMatchBridge } from "@/lib/live/liveMatchBridge";
import { resolveOpponentUid } from "@/lib/live/liveMatchTypes";

export type MovementWriteContext = {
  myUid: string;
  hostUid: string;
  guestUid: string;
  targetUid: string;
};

/**
 * RTDB `players/{uid}` 위치·입력 publish — 반드시 auth.uid 슬롯만 사용.
 * hostUid / playerUids[0] / session.players[0] 등으로 쓰면 안 됨.
 */
export function resolveMovementWriteContext(
  bridge: LiveMatchBridge,
  hookMyUid: string,
): MovementWriteContext | null {
  const authUid = auth.currentUser?.uid?.trim() || "";
  if (!authUid) return null;

  const [hostUid, guestUid] = bridge.playerUids;

  if (bridge.myUid !== authUid) {
    console.error("[liveMatch] bridge.myUid !== auth.uid — correcting bridge", {
      bridgeMyUid: bridge.myUid,
      authUid,
    });
    bridge.myUid = authUid;
    const opp = resolveOpponentUid(authUid, bridge.playerUids);
    if (opp) bridge.opponentUid = opp;
  }

  if (hookMyUid && hookMyUid !== authUid) {
    console.error("[liveMatch] hook myUid !== auth.uid", { hookMyUid, authUid });
  }

  const targetUid = authUid;

  if (targetUid !== authUid) {
    console.error("[WRITE] blocked: targetUid must equal auth.uid", { targetUid, authUid });
    return null;
  }

  const opp = resolveOpponentUid(targetUid, bridge.playerUids);
  if (!opp || opp === targetUid) {
    console.error("[liveMatch] invalid opponentUid for movement write", {
      targetUid,
      opp,
      playerUids: bridge.playerUids,
    });
    return null;
  }

  return { myUid: authUid, hostUid, guestUid, targetUid };
}

let lastWriteLogKey = "";
let lastWriteLogAt = 0;
let lastPathLogAt = 0;

/** DEV: 이동 중 write target 검증 (RTDB slot 충돌 디버그) */
export function logMovementWrite(
  ctx: MovementWriteContext,
  pose?: { x: number; y: number },
  rtdbPath?: string,
): void {
  if (!import.meta.env.DEV) return;

  const moving =
    pose != null && (Math.abs(pose.x) > 1 || Math.abs(pose.y) > 1);
  const bug = ctx.targetUid !== ctx.myUid;
  const now = Date.now();
  const key = `${ctx.targetUid}:${bug}:${moving}`;
  if (!bug && !moving) return;
  if (key === lastWriteLogKey && now - lastWriteLogAt < 400) return;
  lastWriteLogKey = key;
  lastWriteLogAt = now;

  console.log("[WRITE]", {
    myUid: ctx.myUid,
    hostUid: ctx.hostUid,
    guestUid: ctx.guestUid,
    targetUid: ctx.targetUid,
    ...(pose ? { x: Math.round(pose.x), y: Math.round(pose.y) } : {}),
  });

  if (rtdbPath && moving && now - lastPathLogAt > 1200) {
    lastPathLogAt = now;
    console.log("[WRITE PATH]", rtdbPath);
  }

  if (bug) {
    console.error("[WRITE] BUG: targetUid !== myUid (guest may be writing host slot)", ctx);
  }
}
