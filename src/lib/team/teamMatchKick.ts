import { ref, update } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { computeKickDirection } from "@/lib/physics/sharedBallPhysics";
import { KICK_FORCE, KICK_RANGE } from "@/lib/physics/physicsConstants";
import { emitKickAttemptTelemetry } from "@/lib/telemetry/matchTelemetryHost";
import {
  buildPassPlayersFromTeamBridge,
  resetPassTelemetrySession,
  tryEmitPassAttemptOnKick,
} from "@/lib/telemetry/passTelemetry";
import { resetPossessionTelemetrySession } from "@/lib/telemetry/possessionTelemetry";
import type { MatchTeamSide } from "@/lib/telemetry/matchEventTypes";
import type { TeamMatchBridge } from "./teamMatchBridge";
import {
  applyTeamKickImpulseFromDirection,
  computeTeamKickImpulse,
} from "./teamMatchBall";
import { liveKickRequestPath } from "./teamMatchRtdb";

export type TeamKickRequestPayload = {
  uid: string;
  /** Host range 검증 — snapshot.players[uid] 우선 */
  x: number;
  y: number;
  mx?: number;
  my?: number;
  /** Guest 의도 슛 방향 (단위벡터, Guest 로컬 ball·pose 기준) */
  dirX: number;
  dirY: number;
  at: number;
};

/** RTDB에 남은 요청 무시 (Phase 0-2) */
export const TEAM_KICK_REQUEST_TTL_MS = 2500;
/** 동일 kicker 연타 시 impulse 중복 방지 */
export const TEAM_KICK_COOLDOWN_MS = 200;
/** Guest → RTDB write 최소 간격 (relay 폭주 방지) */
export const TEAM_KICK_GUEST_SUBMIT_MIN_MS = 160;
/** Host tab-close 감지 (Guest kick reject — T3) */
export const TEAM_HOST_RELAY_STALE_MS = 6000;

type KickRelaySessionState = {
  lastAppliedAtByUid: Record<string, number>;
  lastProcessedRequestAtByUid: Record<string, number>;
  lastGuestSubmitAt: number;
};

const relayStateBySession = new Map<string, KickRelaySessionState>();

function relayState(sessionId: string): KickRelaySessionState {
  const sid = sessionId.trim();
  let s = relayStateBySession.get(sid);
  if (!s) {
    s = { lastAppliedAtByUid: {}, lastProcessedRequestAtByUid: {}, lastGuestSubmitAt: 0 };
    relayStateBySession.set(sid, s);
  }
  return s;
}

export function resetTeamKickRelayState(sessionId: string): void {
  const sid = sessionId.trim();
  if (sid) {
    relayStateBySession.delete(sid);
    resetPassTelemetrySession(sid);
    resetPossessionTelemetrySession(sid);
  }
}

/** Guest kick RTDB write 허용 (T2). T3: connected false 또는 host lastSeen 6s+ stale */
export function isTeamHostKickRelayAvailable(bridge: TeamMatchBridge): boolean {
  const hostUid = bridge.hostUid.trim();
  if (!hostUid) return false;
  if (bridge.snapshot.meta.phase !== "playing") return false;
  if (isTeamHostDisconnectedForGuest(bridge)) return false;

  const hostPlayer = bridge.snapshot.players[hostUid];
  if (!hostPlayer) return true;

  return hostPlayer.connected !== false;
}

/** Host 탭 종료 등 — Guest kick reject (T3, lastSeen RTDB 동기 후에만) */
export function isTeamHostDisconnectedForGuest(bridge: TeamMatchBridge): boolean {
  const hostUid = bridge.hostUid.trim();
  const hostPlayer = bridge.snapshot.players[hostUid];
  if (!hostPlayer || hostPlayer.connected === false) return true;
  const seen = typeof hostPlayer.lastSeen === "number" ? hostPlayer.lastSeen : 0;
  if (seen <= 0) return false;
  return Date.now() - seen >= TEAM_HOST_RELAY_STALE_MS;
}

function guestKickPose(bridge: TeamMatchBridge): { x: number; y: number } {
  const uid = bridge.authUid.trim();
  let { x, y } = bridge.localPose;
  if (Math.hypot(x, y) < 8 && uid) {
    const p = bridge.snapshot.players[uid];
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      x = p.x;
      y = p.y;
    }
  }
  return { x, y };
}

/** Guest 화면 기준 슛 방향 — Host는 이 벡터를 authoritative ball에 적용 */
export function computeGuestRelayKickDirection(
  bridge: TeamMatchBridge,
): { x: number; y: number } | null {
  const { x: kickerX, y: kickerY } = guestKickPose(bridge);
  const ball = bridge.snapshot.ball;
  return computeKickDirection({
    kickerX,
    kickerY,
    ballX: ball.x,
    ballY: ball.y,
    moveInput: bridge.moveInput,
  });
}

/** Host ingest — RTDB players[uid] 우선 (relay pose desync 방지) */
function hostRelayKickerPose(
  bridge: TeamMatchBridge,
  kickerUid: string,
  fallback: { x: number; y: number },
): { x: number; y: number } {
  const p = bridge.snapshot.players[kickerUid.trim()];
  if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
    return { x: p.x, y: p.y };
  }
  return fallback;
}

function canApplyKickForUid(sessionId: string, kickerUid: string, now: number): boolean {
  const last = relayState(sessionId).lastAppliedAtByUid[kickerUid] ?? 0;
  return now - last >= TEAM_KICK_COOLDOWN_MS;
}

function markKickApplied(sessionId: string, kickerUid: string, now: number): void {
  relayState(sessionId).lastAppliedAtByUid[kickerUid] = now;
}

function teamIdForKicker(bridge: TeamMatchBridge, kickerUid: string): MatchTeamSide {
  return bridge.snapshot.players[kickerUid]?.team ?? "A";
}

/** Host authority — snapshot.ball impulse (Scene·Hook 공용) */
export function tryApplyTeamKickToBridge(
  bridge: TeamMatchBridge,
  kickerUid: string,
  kickerX: number,
  kickerY: number,
  moveInput: { x: number; y: number },
): boolean {
  if (bridge.snapshot.meta.phase !== "playing") return false;

  const sessionId = bridge.sessionId.trim();
  const uid = kickerUid.trim();
  const now = Date.now();
  if (sessionId && uid && !canApplyKickForUid(sessionId, uid, now)) {
    if (import.meta.env.DEV) {
      console.log("[TEAM KICK] cooldown skip", { kicker: uid.slice(0, 8) });
    }
    return false;
  }

  const ballBefore = bridge.snapshot.ball;
  const next = computeTeamKickImpulse(
    kickerX,
    kickerY,
    ballBefore,
    moveInput,
    kickerUid,
  );
  if (!next) return false;

  const dirLen = Math.hypot(next.vx, next.vy) || 1;
  const directionX = next.vx / dirLen;
  const directionY = next.vy / dirLen;

  const passPlayers = buildPassPlayersFromTeamBridge(bridge.snapshot.players);
  const isPass = tryEmitPassAttemptOnKick(bridge, {
    sessionId: bridge.sessionId,
    field: bridge.fieldLayout,
    kickerUid: uid,
    kickerX,
    kickerY,
    dirX: directionX,
    dirY: directionY,
    ballX: ballBefore.x,
    ballY: ballBefore.y,
    mode: bridge.mode,
    players: passPlayers,
  });

  if (!isPass) {
    emitKickAttemptTelemetry(bridge, {
      playerUid: uid,
      teamId: teamIdForKicker(bridge, uid),
      ballX: ballBefore.x,
      ballY: ballBefore.y,
      directionX,
      directionY,
      power: KICK_FORCE,
      distanceToBall: Math.hypot(ballBefore.x - kickerX, ballBefore.y - kickerY),
      mode: bridge.mode,
    });
  }

  bridge.snapshot.ball = next;
  if (sessionId && uid) markKickApplied(sessionId, uid, now);
  return true;
}

/**
 * Guest relay — 방향은 Guest 의도, range·ball 위치는 Host SoT.
 */
export function tryApplyTeamKickFromRelayDirection(
  bridge: TeamMatchBridge,
  kickerUid: string,
  kickerX: number,
  kickerY: number,
  direction: { x: number; y: number },
): boolean {
  if (bridge.snapshot.meta.phase !== "playing") return false;

  const sessionId = bridge.sessionId.trim();
  const uid = kickerUid.trim();
  const now = Date.now();
  if (sessionId && uid && !canApplyKickForUid(sessionId, uid, now)) {
    if (import.meta.env.DEV) {
      console.log("[TEAM KICK] relay dir cooldown skip", { kicker: uid.slice(0, 8) });
    }
    return false;
  }

  const ballBefore = bridge.snapshot.ball;
  const dist = Math.hypot(ballBefore.x - kickerX, ballBefore.y - kickerY);
  if (dist > KICK_RANGE) {
    if (import.meta.env.DEV) {
      console.log("[TEAM KICK] relay dir out of range", {
        kicker: uid.slice(0, 8),
        dist: Math.round(dist),
        range: KICK_RANGE,
      });
    }
    return false;
  }

  const next = applyTeamKickImpulseFromDirection(ballBefore, direction, kickerUid);
  if (!next) {
    if (import.meta.env.DEV) {
      console.log("[TEAM KICK] relay dir invalid vector", {
        kicker: uid.slice(0, 8),
        dirX: direction.x,
        dirY: direction.y,
      });
    }
    return false;
  }

  const dirLen = Math.hypot(direction.x, direction.y) || 1;
  const directionX = direction.x / dirLen;
  const directionY = direction.y / dirLen;

  const isPass = tryEmitPassAttemptOnKick(bridge, {
    sessionId: bridge.sessionId,
    field: bridge.fieldLayout,
    kickerUid: uid,
    kickerX,
    kickerY,
    dirX: directionX,
    dirY: directionY,
    ballX: ballBefore.x,
    ballY: ballBefore.y,
    mode: bridge.mode,
    players: buildPassPlayersFromTeamBridge(bridge.snapshot.players),
  });

  if (!isPass) {
    emitKickAttemptTelemetry(bridge, {
      playerUid: uid,
      teamId: teamIdForKicker(bridge, uid),
      ballX: ballBefore.x,
      ballY: ballBefore.y,
      directionX,
      directionY,
      power: KICK_FORCE,
      distanceToBall: dist,
      mode: bridge.mode,
    });
  }

  bridge.snapshot.ball = next;
  if (sessionId && uid) markKickApplied(sessionId, uid, now);
  return true;
}

/** Guest → RTDB kickRequests/{uid} (Host가 onValue로 검증·적용) */
export async function submitGuestTeamKickRequest(bridge: TeamMatchBridge): Promise<void> {
  const uid = bridge.authUid.trim();
  const sessionId = bridge.sessionId.trim();
  const hostUid = bridge.hostUid.trim();
  if (!uid || !sessionId || uid === hostUid) {
    if (import.meta.env.DEV) {
      console.warn("[TEAM KICK] submitGuest skipped — uid is host", {
        uid: uid.slice(0, 8),
        hostUid: hostUid.slice(0, 8),
      });
    }
    return;
  }

  if (!isTeamHostKickRelayAvailable(bridge)) {
    const hostP = bridge.snapshot.players[hostUid];
    const seenAge =
      hostP && typeof hostP.lastSeen === "number" ? Date.now() - hostP.lastSeen : null;
    if (import.meta.env.DEV) {
      console.warn("[TEAM KICK] relay unavailable", {
        hostUid: hostUid.slice(0, 8),
        phase: bridge.snapshot.meta.phase,
        hostLastSeenAgeMs: seenAge,
        hostConnected: hostP?.connected,
      });
    }
    return;
  }

  const now = Date.now();
  const state = relayState(sessionId);
  if (now - state.lastGuestSubmitAt < TEAM_KICK_GUEST_SUBMIT_MIN_MS) {
    if (import.meta.env.DEV) {
      console.log("[TEAM KICK] guest submit throttled");
    }
    return;
  }

  const direction = computeGuestRelayKickDirection(bridge);
  if (!direction) {
    if (import.meta.env.DEV) {
      console.warn("[TEAM KICK] guest relay dir null — out of range on guest view");
    }
    return;
  }

  state.lastGuestSubmitAt = now;

  const { x, y } = guestKickPose(bridge);
  const { x: mx, y: my } = bridge.moveInput;
  const payload: TeamKickRequestPayload = {
    uid,
    x,
    y,
    mx,
    my,
    dirX: direction.x,
    dirY: direction.y,
    at: now,
  };

  try {
    await update(ref(rtdb), {
      [liveKickRequestPath(sessionId, uid)]: payload,
    });
    if (import.meta.env.DEV) {
      console.log("[TEAM KICK] guest relay request (dir)", {
        uid: uid.slice(0, 8),
        dirX: Math.round(direction.x * 100) / 100,
        dirY: Math.round(direction.y * 100) / 100,
        x: Math.round(x),
        y: Math.round(y),
      });
    }
  } catch (e) {
    console.error("[TEAM KICK] guest relay write failed", e);
  }
}

/** Host only — RTDB kickRequests ingest → distance validate → ball → clear */
export function processHostTeamKickRequests(
  bridge: TeamMatchBridge,
  requests: Record<string, TeamKickRequestPayload> | null,
): void {
  const selfUid = bridge.authUid.trim();
  const hostUid = bridge.hostUid.trim();
  if (!selfUid || selfUid !== hostUid) return;
  const sessionId = bridge.sessionId.trim();
  if (!sessionId || !requests || Object.keys(requests).length === 0) return;

  const now = Date.now();
  const state = relayState(sessionId);
  const clears: Record<string, null> = {};

  for (const [uid, raw] of Object.entries(requests)) {
    if (!raw || uid.trim() === hostUid) continue;

    const path = liveKickRequestPath(sessionId, uid);
    const at = typeof raw.at === "number" ? raw.at : 0;

    if (now - at > TEAM_KICK_REQUEST_TTL_MS) {
      clears[path] = null;
      continue;
    }

    const lastSeenAt = state.lastProcessedRequestAtByUid[uid] ?? 0;
    if (at <= lastSeenAt) {
      clears[path] = null;
      continue;
    }
    state.lastProcessedRequestAtByUid[uid] = at;

    const kickerUid = typeof raw.uid === "string" ? raw.uid : uid;
    const fallback = {
      x: typeof raw.x === "number" ? raw.x : 0,
      y: typeof raw.y === "number" ? raw.y : 0,
    };
    const { x: kx, y: ky } = hostRelayKickerPose(bridge, kickerUid, fallback);
    const dirX = typeof raw.dirX === "number" ? raw.dirX : NaN;
    const dirY = typeof raw.dirY === "number" ? raw.dirY : NaN;
    const hasRelayDir = Number.isFinite(dirX) && Number.isFinite(dirY);

    let applied: boolean;
    if (hasRelayDir) {
      applied = tryApplyTeamKickFromRelayDirection(bridge, kickerUid, kx, ky, {
        x: dirX,
        y: dirY,
      });
    } else {
      const mx = typeof raw.mx === "number" ? raw.mx : 0;
      const my = typeof raw.my === "number" ? raw.my : 0;
      applied = tryApplyTeamKickToBridge(bridge, kickerUid, kx, ky, { x: mx, y: my });
      if (import.meta.env.DEV) {
        console.warn("[TEAM KICK] host relay legacy pos-based (no dirX/dirY)");
      }
    }
    clears[path] = null;

    if (import.meta.env.DEV) {
      console.log("[TEAM KICK] host relay", {
        from: kickerUid.slice(0, 8),
        applied,
        mode: hasRelayDir ? "dir" : "pos",
        at,
        vx: applied ? Math.round(bridge.snapshot.ball.vx) : undefined,
        vy: applied ? Math.round(bridge.snapshot.ball.vy) : undefined,
      });
    }
  }

  if (Object.keys(clears).length === 0) return;
  void update(ref(rtdb), clears).catch((e) => {
    console.warn("[TEAM KICK] clear kickRequests failed", e);
  });
}

export function requestTeamKick(bridge: TeamMatchBridge | null | undefined): void {
  console.log("[TEAM KICK] requestTeamKick entered", {
    hasBridge: Boolean(bridge),
    bridgeId: bridge?.id,
  });
  if (!bridge) {
    console.warn("[TEAM KICK] requestTeamKick — bridge null");
    return;
  }

  const selfUid = bridge.authUid.trim();
  const hostUid = bridge.hostUid.trim();

  if (selfUid === hostUid) {
    /** cooldown은 tryApplyTeamKickToBridge(Scene)에서만 — 여기서 막으면 kickRequested 자체가 안 켜짐 */
    bridge.kickRequested = true;
    if (import.meta.env.DEV) {
      console.log("[TEAM KICK] requestTeamKick host local", {
        bridgeId: bridge.id,
        uid: selfUid.slice(0, 8),
      });
    }
    return;
  }

  console.info("[TEAM KICK] requestTeamKick guest relay", {
    bridgeId: bridge.id,
    uid: selfUid.slice(0, 8),
    hostUid: hostUid.slice(0, 8),
  });
  void submitGuestTeamKickRequest(bridge);
}

/** DEV 콘솔: `window.__requestTeamKick__(window.__TEAM_BRIDGE__())` */
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as Window & { __requestTeamKick__?: typeof requestTeamKick }).__requestTeamKick__ =
    requestTeamKick;
}
