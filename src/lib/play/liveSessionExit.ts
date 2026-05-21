import type { MatchmakingMode } from "@/lib/matchmaking/types";

const SKIP_REDIRECT_KEY = "yago_skip_game_session_redirect";

/** 나가기 직후 QuickPlay/Matchmaking이 activeMatch로 세션에 다시 보내지 않게 */
export function setSkipActiveSessionRedirect(ttlMs = 90_000): void {
  try {
    sessionStorage.setItem(SKIP_REDIRECT_KEY, String(Date.now() + ttlMs));
  } catch {
    /* ignore */
  }
}

export function shouldSkipActiveSessionRedirect(): boolean {
  try {
    const raw = sessionStorage.getItem(SKIP_REDIRECT_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until) || Date.now() > until) {
      sessionStorage.removeItem(SKIP_REDIRECT_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearSkipActiveSessionRedirect(): void {
  try {
    sessionStorage.removeItem(SKIP_REDIRECT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 나가기/리매치 직후 RTDB presence·큐 정리.
 * started 매치는 leaveMatch 불가 → clearActiveMatch만.
 * UI hook의 leaveMatch/leaveQueue(loading=true)는 쓰지 않음.
 */
export async function clearStaleActiveMatchForRematch(
  matchId: string,
  mode: MatchmakingMode = "5v5",
): Promise<boolean> {
  const id = matchId.trim();
  if (!id) return false;

  const { callClearActiveMatch, callLeaveQueue } = await import(
    "@/lib/matchmaking/matchmakingClient"
  );

  let cleared = false;
  try {
    await callClearActiveMatch(id);
    cleared = true;
  } catch (e) {
    console.warn("[liveSession] clearActiveMatch", e);
  }
  try {
    await callLeaveQueue(mode);
  } catch (e) {
    console.warn("[liveSession] leaveQueue", e);
  }
  return cleared;
}
