import type { LiveMatchBridge } from "./liveMatchBridge";
import type { LiveMatchPhase, LiveMatchState, LivePlayerState } from "./liveMatchTypes";

const PHASE_RANK: Record<string, number> = {
  lobby: 0,
  waiting: 0,
  countdown: 1,
  playing: 2,
  goal: 2,
  ended: 3,
};

/** 골 축하 중 — goalResetAt 이전만 */
export function isGoalCelebration(match: Pick<LiveMatchState, "phase" | "goalResetAt">): boolean {
  return match.phase === "goal" && match.goalResetAt > Date.now();
}

/**
 * phase 병합 — 축하 중 goal 우선, 축하 종료 후 countdown > stale goal > playing.
 * (goal·playing 동일 PHASE_RANK → hostPublish가 goal을 playing으로 되돌려 축하 타이머 정지)
 */
export function resolveMatchPhase(a: LiveMatchState, b: LiveMatchState): LiveMatchPhase {
  const aLive = isGoalCelebration(a);
  const bLive = isGoalCelebration(b);
  if (aLive || bLive) return "goal";

  const flow = (m: LiveMatchState): number => {
    switch (m.phase) {
      case "ended":
        return 100;
      case "playing":
        return 40;
      case "countdown":
        return 35;
      case "goal":
        return 5;
      case "lobby":
      case "waiting":
      default:
        return 0;
    }
  };

  return flow(a) >= flow(b) ? a.phase : b.phase;
}

/**
 * phase 역행 방지 + 동일 phase에서는 스코어·타이머 병합.
 */
export function pickAdvancedMatch(a: LiveMatchState, b: LiveMatchState): LiveMatchState {
  const rankA = PHASE_RANK[a.phase] ?? 0;
  const rankB = PHASE_RANK[b.phase] ?? 0;
  const primary = rankA > rankB ? a : rankB > rankA ? b : b;
  const secondary = rankA > rankB ? b : rankB > rankA ? a : a;
  const bothPlaying = a.phase === "playing" && b.phase === "playing";
  const countdownAt = Math.max(a.countdownStartedAt ?? 0, b.countdownStartedAt ?? 0);
  const phase = resolveMatchPhase(a, b);
  const goalResetAt =
    phase === "goal" ? Math.max(a.goalResetAt, b.goalResetAt) : 0;

  return {
    ...secondary,
    ...primary,
    phase,
    scoreA: Math.max(a.scoreA, b.scoreA),
    scoreB: Math.max(a.scoreB, b.scoreB),
    timeRemainingMs: bothPlaying
      ? Math.min(a.timeRemainingMs, b.timeRemainingMs)
      : primary.timeRemainingMs,
    goalResetAt,
    startedAt: Math.max(a.startedAt, b.startedAt),
    countdownStartedAt: countdownAt > 0 ? countdownAt : undefined,
    hostUid: primary.hostUid || secondary.hostUid,
    playerUids: primary.playerUids ?? secondary.playerUids,
  };
}

/** phase 문자열만 있을 때 (lobby floor 등) — ended > playing > countdown > goal */
export function pickAdvancedPhase(a: LiveMatchPhase, b: LiveMatchPhase): LiveMatchPhase {
  const rank = (p: LiveMatchPhase): number => {
    switch (p) {
      case "ended":
        return 100;
      case "playing":
        return 40;
      case "countdown":
        return 35;
      case "goal":
        return 25;
      case "lobby":
      case "waiting":
      default:
        return 0;
    }
  };
  return rank(a) >= rank(b) ? a : b;
}

export function phaseRank(phase: LiveMatchPhase): number {
  return PHASE_RANK[phase] ?? 0;
}

type PlayerReadyRow = LivePlayerState & {
  isReady?: boolean | string | number;
  localReady?: boolean;
  ready?: boolean | string | number;
};

function truthyReadyFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

/** RTDB row — ready / isReady / 문자열·숫자·localReady (connected는 로비 준비와 분리) */
export function readPlayerReadyValue(p: LivePlayerState | undefined): boolean {
  if (!p) return false;
  const row = p as PlayerReadyRow;
  if (row.localReady === true) return true;
  if (truthyReadyFlag(row.ready)) return true;
  if (truthyReadyFlag(row.isReady)) return true;
  return false;
}

export type PlayerReadyDiagRow = {
  uid: string;
  inMap: boolean;
  ready: unknown;
  isReady: unknown;
  localReady: unknown;
  connected: unknown;
  connectedBlocks: boolean;
  readValue: boolean;
  read: boolean;
};

export function buildPlayerReadyDiagnostics(
  playerUids: [string, string],
  players: Record<string, LivePlayerState>,
  myUid: string,
  localReady: boolean,
): PlayerReadyDiagRow[] {
  const rtdbKeys = Object.keys(players).filter(Boolean);
  const rows: PlayerReadyDiagRow[] = [];

  for (const uid of playerUids) {
    const p = players[uid];
    const row = p as PlayerReadyRow | undefined;
    rows.push({
      uid,
      inMap: Boolean(p),
      ready: row?.ready,
      isReady: row?.isReady,
      localReady: uid === myUid ? localReady : row?.localReady,
      connected: row?.connected,
      connectedBlocks: row?.connected === false,
      readValue: readPlayerReadyValue(p),
      read: readPlayerReady(p, uid, myUid, localReady),
    });
  }

  for (const uid of rtdbKeys) {
    if (playerUids.includes(uid)) continue;
    const p = players[uid];
    const row = p as PlayerReadyRow;
    rows.push({
      uid: `${uid} (rtdb only)`,
      inMap: true,
      ready: row?.ready,
      isReady: row?.isReady,
      localReady: row?.localReady,
      connected: row?.connected,
      connectedBlocks: row?.connected === false,
      readValue: readPlayerReadyValue(p),
      read: readPlayerReady(p, uid, myUid, localReady),
    });
  }

  return rows;
}

/** DevTools 접힘 없이 필드값 확인용 */
export function logPlayerReadyDiagnostics(
  label: string,
  playerUids: [string, string],
  players: Record<string, LivePlayerState>,
  myUid: string,
  localReady: boolean,
  allReady: boolean,
): void {
  const rows = buildPlayerReadyDiagnostics(playerUids, players, myUid, localReady);
  console.log(`[liveMatch] ${label} allReady=${allReady} hostLocalReady=${localReady}`);
  console.table(rows);
  for (const r of rows) {
    console.log(
      `[liveMatch] ${label} uid=${r.uid.slice(0, 12)} inMap=${r.inMap} ready=${JSON.stringify(r.ready)} isReady=${JSON.stringify(r.isReady)} localReady=${JSON.stringify(r.localReady)} connected=${JSON.stringify(r.connected)} connectedBlocks=${r.connectedBlocks} readValue=${r.readValue} read=${r.read}`,
    );
  }
}

export function readPlayerReady(
  p: LivePlayerState | undefined,
  uid: string,
  myUid: string,
  localReady: boolean,
): boolean {
  if (uid === myUid && localReady) return true;
  return readPlayerReadyValue(p);
}

/**
 * RTDB `liveSessions/{id}/players/{uid}` 맵 (array 아님).
 */
export function areAllPlayersMatchReady(
  playerUids: [string, string],
  players: Record<string, LivePlayerState>,
  myUid: string,
  localReady: boolean,
): boolean {
  const bySession = playerUids.every((uid) => readPlayerReady(players[uid], uid, myUid, localReady));
  if (bySession) return true;

  const entries = Object.entries(players).filter(([k, p]) => Boolean(k) && Boolean(p));
  if (entries.length < 2) return false;

  return entries.every(([uid, p]) => readPlayerReady(p, uid, myUid, localReady));
}

/** Phaser 호스트 루프 — bridge 스냅샷 기준 */
export function isBridgeLobbyReady(bridge: LiveMatchBridge): boolean {
  return areAllPlayersMatchReady(
    bridge.playerUids,
    bridge.snapshot.players,
    bridge.myUid,
    bridge.localReady === true,
  );
}

export function buildLobbyCountdownMatch(match: LiveMatchState): LiveMatchState {
  return { ...match, phase: "countdown", countdownStartedAt: Date.now() };
}
