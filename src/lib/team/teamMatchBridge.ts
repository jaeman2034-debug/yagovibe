import type { MatchmakingMode } from "@/lib/matchmaking/types";
import type { LiveFieldLayout } from "@/lib/live/liveFieldLayout";
import type { MatchTelemetrySession } from "@/lib/telemetry/matchTelemetryHost";
import type {
  TeamBallState,
  TeamMatchSnapshot,
  TeamPlayerState,
} from "./teamMatchTypes";

export type TeamRemoteNetPose = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastSeen: number;
};

export type TeamMatchBridge = {
  /** Overlay·Scene 동일 인스턴스 확인용 (PATCH 1) */
  id: string;
  sessionId: string;
  /** localPlayerUid === auth.currentUser.uid */
  authUid: string;
  /** @deprecated — authUid와 동일. 기존 호출 호환 */
  myUid: string;
  hostUid: string;
  mode: MatchmakingMode;
  playerUids: string[];
  fieldLayout: LiveFieldLayout;
  /** HUD / score / phase — movement source 금지 (TEAM_LIVE_CONTRACT §6) */
  snapshot: TeamMatchSnapshot;
  /** RTDB onValue만 갱신 — remote puppet 전용 */
  remoteNetPose: Record<string, TeamRemoteNetPose>;
  moveInput: { x: number; y: number };
  localPose: { x: number; y: number; vx: number; vy: number };
  kickRequested?: boolean;
  /** Host Scene → React HUD (score/ball 즉시 반영, RTDB listener 전) */
  applyHudToReact?: (
    partial: Pick<Partial<TeamMatchSnapshot>, "ball" | "score" | "meta">,
  ) => void;
  /** Host-only telemetry (TRACK 1 C3) */
  telemetrySession?: MatchTelemetrySession;
};

export type CreateTeamMatchBridgeArgs = {
  sessionId: string;
  /** Firebase Auth uid — Scene localPlayerUid와 동일 */
  authUid: string;
  hostUid: string;
  mode: MatchmakingMode;
  playerUids: string[];
  fieldLayout: LiveFieldLayout;
  snapshot: TeamMatchSnapshot;
};

/**
 * 세션당 bridge 1개 — React useRef로만 보관. 전역 Map / getInstance 금지.
 * @see docs/TEAM_LIVE_CONTRACT.md
 */
export function createTeamMatchBridge(args: CreateTeamMatchBridgeArgs): TeamMatchBridge {
  const sessionId = args.sessionId.trim();
  const authUid = args.authUid.trim();
  if (!sessionId || !authUid) {
    throw new Error("[teamMatch] createTeamMatchBridge requires sessionId and authUid");
  }

  const bridge: TeamMatchBridge = {
    id: `team-${sessionId}-${authUid}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    authUid,
    myUid: authUid,
    hostUid: args.hostUid.trim(),
    mode: args.mode,
    playerUids: [...args.playerUids],
    fieldLayout: args.fieldLayout,
    snapshot: args.snapshot,
    remoteNetPose: {},
    moveInput: { x: 0, y: 0 },
    localPose: { x: 0, y: 0, vx: 0, vy: 0 },
    kickRequested: false,
  };

  return bridge;
}

/** @deprecated CreateTeamMatchBridgeArgs 사용 */
export type CreateTeamMatchBridgeParams = CreateTeamMatchBridgeArgs;

/** remoteNetPose에 self·비참가 uid 키가 남지 않도록 정리 (selfUid는 Hook myUid SoT) */
export function pruneTeamRemoteNetPose(
  bridge: TeamMatchBridge,
  playerUids: string[],
  ingestSelfUid?: string,
): void {
  const selfUid = (ingestSelfUid ?? bridge.authUid).trim();
  if (!selfUid) return;
  const opponents = new Set(
    playerUids
      .map((u) => u.trim())
      .filter((u) => u && u !== selfUid),
  );
  for (const key of Object.keys(bridge.remoteNetPose)) {
    if (key === selfUid || !opponents.has(key)) {
      delete bridge.remoteNetPose[key];
    }
  }
}

/** RTDB onValue → remote puppet (self uid 제외) */
export function patchTeamRemoteNetPose(
  bridge: TeamMatchBridge,
  uid: string,
  partial: Partial<TeamRemoteNetPose>,
  ingestSelfUid?: string,
): void {
  const remoteUid = uid.trim();
  const selfUid = (ingestSelfUid ?? bridge.authUid).trim();
  if (!remoteUid || !selfUid || remoteUid === selfUid) return;

  const nx = partial.x;
  const ny = partial.y;
  if (
    typeof nx === "number" &&
    typeof ny === "number" &&
    Math.hypot(nx - bridge.localPose.x, ny - bridge.localPose.y) < 12
  ) {
    if (import.meta.env.DEV) {
      console.log("[REMOTE NET] echo skip", {
        remoteUid: remoteUid.slice(0, 8),
        authUid: bridge.authUid.slice(0, 8),
        x: Math.round(nx),
        y: Math.round(ny),
      });
    }
    return;
  }

  const cur = bridge.remoteNetPose[remoteUid];
  bridge.remoteNetPose[remoteUid] = {
    x: partial.x ?? cur?.x ?? 0,
    y: partial.y ?? cur?.y ?? 0,
    vx: partial.vx ?? cur?.vx ?? 0,
    vy: partial.vy ?? cur?.vy ?? 0,
    lastSeen: partial.lastSeen ?? Date.now(),
  };
}

export { requestTeamKick } from "./teamMatchKick";

/** HUD: ball / score / meta 만. players 좌표는 puppet 경로와 분리 */
export function mergeTeamBridgeHudSnapshot(
  bridge: TeamMatchBridge,
  partial: Pick<Partial<TeamMatchSnapshot>, "ball" | "score" | "meta">,
): void {
  if (partial.ball) {
    bridge.snapshot.ball = { ...bridge.snapshot.ball, ...partial.ball };
  }
  if (partial.score) {
    bridge.snapshot.score = { ...bridge.snapshot.score, ...partial.score };
  }
  if (partial.meta) {
    bridge.snapshot.meta = { ...bridge.snapshot.meta, ...partial.meta };
  }
}

/** @deprecated movement·puppet 금지. HUD players 메타만 hook에서 직접 할당 */
export function mergeTeamBridgeHudPlayers(
  bridge: TeamMatchBridge,
  players: Record<string, TeamPlayerState>,
): void {
  bridge.snapshot.players = { ...players };
}

/** 세션 종료 시 입력·킥 플래그 초기화 (전역 registry 없음) */
export function resetTeamMatchBridgeInput(bridge: TeamMatchBridge | null | undefined): void {
  if (!bridge) return;
  bridge.moveInput.x = 0;
  bridge.moveInput.y = 0;
  bridge.kickRequested = false;
}
