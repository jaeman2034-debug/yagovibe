import type { MatchmakingMode } from "./types";

const TARGET: Record<MatchmakingMode, number> = { "1v1": 2, "5v5": 10, "8v8": 16 };

/** 클라이언트 표시·큐 재시도 — 서버 `playersRequiredForMode` 와 DEV 시 동일하게 맞출 것 */
export function playersRequiredForModeClient(mode: MatchmakingMode): number {
  if (mode === "1v1") return 2;
  const raw = import.meta.env.VITE_MATCHMAKING_DEV_MIN_PLAYERS?.trim();
  if (raw) {
    const n = Math.max(2, Math.floor(Number(raw) || 2));
    return Math.min(n, TARGET[mode]);
  }
  if (import.meta.env.DEV) return 2;
  return TARGET[mode];
}
