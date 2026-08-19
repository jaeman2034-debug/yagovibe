import {
  clearPlaygroundMove,
  requestPlaygroundKick,
  setPlaygroundMove,
} from "@/game/playground/playgroundInput";
import { firePlaygroundKick } from "@/game/playground/playgroundSceneBridge";
import {
  clearLiveMatchMove,
  requestLiveMatchKick,
  setLiveMatchMove,
} from "@/lib/live/liveMatchInput";
import type { PlayInputActions, MoveVector } from "./PlayInputActions";
import { clearTeamMatchMove, setTeamMatchMove } from "@/lib/team/teamMatchInput";
import { requestTeamKick } from "@/lib/team/teamMatchKick";
import type { TeamMatchBridge } from "@/lib/team/teamMatchBridge";

export type PlayInputMode = "1v1" | "5v5" | "8v8" | "playground";

export type PlayInputContext =
  | { mode: "1v1"; sessionId: string }
  | { mode: "playground" }
  | {
      mode: "5v5" | "8v8";
      sessionId: string;
      /** Overlay에서 전달 — usePlayInput은 getBridge로 최신 ref 유지 */
      bridge?: TeamMatchBridge | null;
      getBridge?: () => TeamMatchBridge | null;
    };

function resolveTeamBridge(
  ctx: Extract<PlayInputContext, { mode: "5v5" | "8v8" }>,
): TeamMatchBridge | null {
  return ctx.getBridge?.() ?? ctx.bridge ?? null;
}

function isZeroMove(dir: MoveVector): boolean {
  return Math.hypot(dir.x, dir.y) < 0.001;
}

function createLive1v1Adapter(sessionId: string): PlayInputActions {
  const sid = sessionId.trim();
  return {
    move(dir) {
      if (!sid) return;
      if (isZeroMove(dir)) {
        clearLiveMatchMove(sid);
        return;
      }
      setLiveMatchMove(sid, dir.x, dir.y);
    },
    kick() {
      console.log("[LIVE KICK] adapter kick");
      if (!sid) return;
      requestLiveMatchKick(sid);
    },
  };
}

function createTeamAdapter(
  sessionId: string,
  getBridge: () => TeamMatchBridge | null,
): PlayInputActions {
  const sid = sessionId.trim();
  return {
    move(dir) {
      if (!sid) return;
      const bridge = getBridge();
      if (isZeroMove(dir)) {
        clearTeamMatchMove(sid, bridge);
        return;
      }
      setTeamMatchMove(sid, dir.x, dir.y, bridge);
    },
    kick() {
      console.log("[TEAM KICK] adapter kick");
      requestTeamKick(getBridge());
    },
  };
}

function createPlaygroundAdapter(): PlayInputActions {
  return {
    move(dir) {
      if (isZeroMove(dir)) {
        clearPlaygroundMove();
        return;
      }
      setPlaygroundMove(dir.x, dir.y);
    },
    kick() {
      requestPlaygroundKick();
      firePlaygroundKick(true);
    },
  };
}

/** 모드별 RTDB/bridge 차이를 숨기고 PlayInputActions만 노출 */
export function createPlayInputAdapter(ctx: PlayInputContext): PlayInputActions {
  if (ctx.mode === "playground") {
    return createPlaygroundAdapter();
  }
  if (ctx.mode === "1v1") {
    return createLive1v1Adapter(ctx.sessionId);
  }
  const teamCtx = ctx as Extract<PlayInputContext, { mode: "5v5" | "8v8" }>;
  const getBridge =
    teamCtx.getBridge ?? (() => resolveTeamBridge(teamCtx));
  return createTeamAdapter(teamCtx.sessionId, getBridge);
}
