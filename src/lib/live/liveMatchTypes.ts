import type { FieldLayoutMode } from "./liveFieldLayout";

export type LiveMatchPhase = "lobby" | "countdown" | "playing" | "goal" | "ended" | "waiting";

export type LivePlayerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ready: boolean;
  connected: boolean;
  lastSeen: number;
};

export type LiveBallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerUid: string | null;
};

export type LiveMatchState = {
  phase: LiveMatchPhase;
  scoreA: number;
  scoreB: number;
  timeRemainingMs: number;
  startedAt: number;
  hostUid: string;
  playerUids: [string, string];
  goalResetAt: number;
  /** lobby → countdown 시각 (RTDB·호스트 트리거) */
  countdownStartedAt?: number;
};

export type LiveMatchSnapshot = {
  players: Record<string, LivePlayerState>;
  ball: LiveBallState;
  match: LiveMatchState;
};

export const LIVE_MATCH_TIMING = {
  matchDurationMs: 90_000,
  reconnectGraceMs: 15_000,
  syncIntervalMs: 70,
  goalCelebrationMs: 2500,
} as const;

/** @deprecated 치수는 getLiveFieldLayout() 사용 */
export const LIVE_FIELD = {
  w: 1200,
  h: 800,
  margin: 48,
  goalDepth: 36,
  ...LIVE_MATCH_TIMING,
} as const;

export function sortPlayerUids(uids: string[]): [string, string] | null {
  const uniq = [...new Set(uids.filter(Boolean))].sort();
  if (uniq.length < 2) return null;
  return [uniq[0], uniq[1]];
}

export function pickHostUid(uids: [string, string]): string {
  return uids[0];
}

/** RTDB `players/{uid}` — index/순서가 아닌 uid로만 매핑 */
export function resolveOpponentUid(
  myUid: string,
  playerUids: [string, string],
): string | null {
  const me = myUid.trim();
  if (!me) return null;
  if (playerUids[0] === me) return playerUids[1];
  if (playerUids[1] === me) return playerUids[0];
  return null;
}

/** RTDB players 맵에서 세션 uid 2개만 추출 (0/1 인덱스 키·기타 노이즈 제거) */
export function pickCanonicalPlayers(
  raw: Record<string, LivePlayerState | null | undefined> | null | undefined,
  playerUids: [string, string],
): Record<string, LivePlayerState> {
  const out: Record<string, LivePlayerState> = {};
  if (!raw) return out;
  for (const uid of playerUids) {
    const p = raw[uid];
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      out[uid] = {
        x: p.x,
        y: p.y,
        vx: Number.isFinite(p.vx) ? p.vx : 0,
        vy: Number.isFinite(p.vy) ? p.vy : 0,
        ready: Boolean(p.ready),
        connected: p.connected !== false,
        lastSeen: typeof p.lastSeen === "number" ? p.lastSeen : Date.now(),
      };
    }
  }
  return out;
}

/** Firestore/RTDB에서 playerUids가 배열·객체로 올 때 정규화 */
export function normalizePlayerUids(raw: unknown): [string, string] | null {
  if (Array.isArray(raw)) {
    return sortPlayerUids(raw.filter((u): u is string => typeof u === "string"));
  }
  if (raw && typeof raw === "object") {
    const vals = Object.values(raw as Record<string, unknown>).filter(
      (u): u is string => typeof u === "string" && Boolean(u.trim()),
    );
    return sortPlayerUids(vals);
  }
  return null;
}

/**
 * RTDB scoreA/scoreB ↔ playerUids[0] (하단·좌 스폰) 매핑.
 * Portrait: 상단 골=scoreB, 하단 골=scoreA — uidA는 상대 골대(상단)에 득점 → scoreB.
 * Landscape: 우측 골=scoreA, 좌측 골=scoreB — uidA는 우측 골대에 득점 → scoreA.
 */
export function resolveLiveScores(
  myUid: string,
  match: LiveMatchState,
  layoutMode: FieldLayoutMode,
): { myScore: number; oppScore: number; uidA: string; uidB: string } {
  const sorted = sortPlayerUids([...match.playerUids]) ?? match.playerUids;
  const [uidA, uidB] = sorted;
  const myIsA = myUid === uidA;

  if (layoutMode === "portrait") {
    return {
      uidA,
      uidB,
      myScore: myIsA ? match.scoreB : match.scoreA,
      oppScore: myIsA ? match.scoreA : match.scoreB,
    };
  }

  return {
    uidA,
    uidB,
    myScore: myIsA ? match.scoreA : match.scoreB,
    oppScore: myIsA ? match.scoreB : match.scoreA,
  };
}

export function formatLiveMatchResult(myScore: number, oppScore: number): string {
  if (myScore > oppScore) return "승리!";
  if (myScore < oppScore) return "패배";
  return "무승부";
}
