import { requestTeamKick } from "./teamMatchKick";
import type { TeamMatchBridge, TeamRemoteNetPose } from "./teamMatchBridge";

export type TeamMatchDevDebugPayload = {
  bridgeId: string;
  sessionId: string;
  authUid: string;
  /** Firebase Auth uid (ingest SoT 비교용) */
  firebaseAuthUid?: string;
  /** Hook props myUid — ingest SoT */
  hookMyUid: string;
  /** sortTeamPlayerUids(playerUids) — trim 정규화 후 */
  sortedUids: string[];
  /** self 키가 remoteNetPose에 섞였는지 */
  selfKeyLeaked: boolean;
  remoteNetPose: Record<string, TeamRemoteNetPose>;
  remoteNetPoseKeys: string[];
  kickRequested: boolean;
  /** Hook isHost — kickRequests relay subscriber */
  isHost: boolean;
  pickHostUid: string;
  rtdbMatchHostUid: string | null;
  moveInput: { x: number; y: number };
  score: { teamA: number; teamB: number };
  /** Scene이 붙인 bridge.id (overlay/init와 비교) */
  sceneBridgeId?: string;
  /** Host telemetry (C3) */
  telemetryAttached?: boolean;
  hookMatchId?: string;
  telemetryBufferLen?: number;
};

/** DEV: 콘솔 `window.__TEAM_DEBUG__` — Hook bridge + remoteNetPose 스냅샷 */
export function syncTeamMatchDevDebug(
  bridge: TeamMatchBridge | null,
  extra?: Partial<
    Pick<
      TeamMatchDevDebugPayload,
      | "sceneBridgeId"
      | "firebaseAuthUid"
      | "hookMyUid"
      | "sortedUids"
      | "isHost"
      | "pickHostUid"
      | "rtdbMatchHostUid"
    >
  >,
): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  const w = window as Window & { __TEAM_DEBUG__?: TeamMatchDevDebugPayload };

  if (!bridge) {
    w.__TEAM_DEBUG__ = undefined;
    const wClear = w as Window & {
      __TEAM_BRIDGE__?: () => TeamMatchBridge | null;
      __requestTeamKick__?: (b: TeamMatchBridge | null | undefined) => void;
    };
    wClear.__TEAM_BRIDGE__ = undefined;
    wClear.__requestTeamKick__ = undefined;
    return;
  }

  const hookMyUid = (extra?.hookMyUid ?? "").trim();
  const sortedUids =
    extra?.sortedUids?.length
      ? extra.sortedUids
      : [...bridge.playerUids].map((u) => u.trim()).filter(Boolean);
  const selfUid = hookMyUid || bridge.authUid.trim();
  const remoteNetPoseKeys = Object.keys(bridge.remoteNetPose);
  w.__TEAM_DEBUG__ = {
    bridgeId: bridge.id,
    sessionId: bridge.sessionId,
    authUid: bridge.authUid,
    firebaseAuthUid: extra?.firebaseAuthUid,
    hookMyUid,
    sortedUids,
    selfKeyLeaked: Boolean(selfUid && remoteNetPoseKeys.includes(selfUid)),
    remoteNetPose: { ...bridge.remoteNetPose },
    remoteNetPoseKeys,
    kickRequested: Boolean(bridge.kickRequested),
    isHost: Boolean(extra?.isHost),
    pickHostUid: (extra?.pickHostUid ?? bridge.hostUid).trim(),
    rtdbMatchHostUid: extra?.rtdbMatchHostUid ?? null,
    moveInput: { x: bridge.moveInput.x, y: bridge.moveInput.y },
    score: { ...bridge.snapshot.score },
    sceneBridgeId: extra?.sceneBridgeId ?? w.__TEAM_DEBUG__?.sceneBridgeId,
    telemetryAttached: Boolean(bridge.telemetrySession),
    hookMatchId: extra?.hookMatchId ?? "",
    telemetryBufferLen: bridge.telemetrySession?.emitter.bufferMatchEvents().length ?? 0,
  };

  const wBridge = w as Window & {
    __TEAM_BRIDGE__?: () => TeamMatchBridge | null;
    __requestTeamKick__?: (b: TeamMatchBridge | null | undefined) => void;
  };
  wBridge.__TEAM_BRIDGE__ = () => bridge;
  wBridge.__requestTeamKick__ = requestTeamKick;
}
