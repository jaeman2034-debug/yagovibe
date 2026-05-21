import type { LiveFieldLayout } from "./liveFieldLayout";
import type { LiveBallState, LiveMatchSnapshot, LiveMatchState, LivePlayerState } from "./liveMatchTypes";

export type HostMatchCommitPayload = {
  match: LiveMatchState;
  ball?: LiveBallState;
};

/** Phaser ↔ React RTDB 브리지 (세션당 1개) */
export type LiveMatchBridge = {
  sessionId: string;
  myUid: string;
  opponentUid: string;
  isHost: boolean;
  playerIndex: 0 | 1;
  playerUids: [string, string];
  fieldLayout: LiveFieldLayout;
  snapshot: LiveMatchSnapshot;
  /** 씬 → 훅: 내 플레이어 위치 (RTDB 업로드용) */
  localPose: { x: number; y: number; vx: number; vy: number };
  /** RTDB onValue에서만 갱신 — snapshot merge와 분리된 상대 좌표 */
  opponentNetworkPose: (LivePlayerState & { networkUid?: string }) | null;
  /** React 조이스틱 — 이 세션 bridge에만 저장 (전역 store 금지) */
  moveInput: { x: number; y: number };
  /** UI 슛 버튼 1회 — wantsKick(RTDB)와 분리 */
  pendingLocalKick?: boolean;
  wantsKick: boolean;
  /** 호스트: 상대 wantsKick 1회 처리 후 RTDB에서 제거 */
  pendingClearOpponentKick?: boolean;
  /** React 로비 준비 (RTDB merge 전에도 호스트 씬이 본인 ready 인식) */
  localReady?: boolean;
  /** 호스트: 씬이 매 프레임 갱신 → 훅이 RTDB에 쓰기 */
  hostPublish?: {
    players: Record<string, LivePlayerState>;
    ball: LiveBallState;
    match: LiveMatchSnapshot["match"];
  };
};

let bridge: LiveMatchBridge | null = null;
let hostMatchCommitHandler: ((sessionId: string, payload: HostMatchCommitPayload) => void) | null =
  null;

export function setLiveMatchBridge(b: LiveMatchBridge | null): void {
  bridge = b;
}

/** 호스트: phase 전환 등 즉시 RTDB 반영 (70ms 폴링만으로는 goal stuck 가능) */
export function setHostMatchCommitHandler(
  handler: ((sessionId: string, payload: HostMatchCommitPayload) => void) | null,
): void {
  hostMatchCommitHandler = handler;
}

export function commitHostMatchState(sessionId: string, payload: HostMatchCommitPayload): void {
  hostMatchCommitHandler?.(sessionId, payload);
}

export function getLiveMatchBridge(): LiveMatchBridge | null {
  return bridge;
}

export function updateBridgeSnapshot(partial: Partial<LiveMatchSnapshot>): void {
  if (!bridge) return;
  bridge.snapshot = {
    players: { ...bridge.snapshot.players, ...partial.players },
    ball: { ...bridge.snapshot.ball, ...partial.ball },
    match: { ...bridge.snapshot.match, ...partial.match },
  };
}
