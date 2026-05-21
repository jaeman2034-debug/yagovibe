export type MatchmakingMode = "1v1" | "5v5" | "8v8";

export const MATCHMAKING_MODES: MatchmakingMode[] = ["1v1", "5v5", "8v8"];

/** 프로덕션 목표 인원 */
export const MATCH_PLAYERS_TARGET: Record<MatchmakingMode, number> = {
  "1v1": 2,
  "5v5": 10,
  "8v8": 16,
};

/** 큐 항목 TTL — 미 heartbeat 시 prune */
export const QUEUE_ENTRY_TTL_MS = 3 * 60 * 1000;

/** 매치 준비 화면 TTL */
export const MATCH_READY_TTL_MS = 5 * 60 * 1000;

/** formation lock 최대 유지 */
export const FORMATION_LOCK_MS = 12_000;

/** MVP·스테이징: `MATCHMAKING_DEV_MIN_PLAYERS=2` 로 낮출 수 있음 */
export function playersRequiredForMode(mode: MatchmakingMode): number {
  if (mode === "1v1") return 2;
  const raw = process.env.MATCHMAKING_DEV_MIN_PLAYERS?.trim();
  if (raw) {
    const n = Math.max(2, Math.floor(Number(raw) || 2));
    return Math.min(n, MATCH_PLAYERS_TARGET[mode]);
  }
  return MATCH_PLAYERS_TARGET[mode];
}

export function isMatchmakingMode(v: unknown): v is MatchmakingMode {
  return v === "1v1" || v === "5v5" || v === "8v8";
}
