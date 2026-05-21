import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { getMatchmakingClientId } from "./matchmakingClientId";
import type { JoinQueueResponse, MatchmakingMode } from "./types";

function parseCallableError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  const msg = typeof err?.message === "string" ? err.message : "";
  if (err?.code === "functions/already-exists") {
    return "다른 탭에서 이미 큐에 있습니다. 기존 탭을 닫거나 큐를 취소해 주세요.";
  }
  if (err?.code === "functions/failed-precondition") {
    return msg || "매치가 만료되었거나 취소되었습니다.";
  }
  if (err?.code === "functions/permission-denied") {
    return msg || "세션 접근 권한이 없습니다.";
  }
  if (err?.code === "functions/not-found") {
    return msg || "세션을 찾을 수 없습니다.";
  }
  return msg || "요청에 실패했습니다.";
}

export async function callJoinQueue(mode: MatchmakingMode, teamId?: string): Promise<JoinQueueResponse> {
  const fn = httpsCallable<
    { mode: MatchmakingMode; teamId?: string; clientId: string },
    JoinQueueResponse
  >(functions, "joinQueue");
  try {
    const res = await fn({
      mode,
      clientId: getMatchmakingClientId(),
      ...(teamId?.trim() ? { teamId: teamId.trim() } : {}),
    });
    return res.data;
  } catch (e) {
    throw new Error(parseCallableError(e));
  }
}

export async function callLeaveQueue(mode: MatchmakingMode): Promise<void> {
  const fn = httpsCallable<{ mode: MatchmakingMode }, { ok: boolean }>(functions, "leaveQueue");
  await fn({ mode });
}

export async function callLeaveMatch(matchId: string): Promise<void> {
  const fn = httpsCallable<{ matchId: string }, { ok: boolean }>(functions, "leaveMatch");
  await fn({ matchId });
}

/** 경기 종료 후 리매치 — presence activeMatchId 해제 */
export async function callClearActiveMatch(matchId: string): Promise<void> {
  const fn = httpsCallable<{ matchId: string }, { ok: boolean }>(functions, "clearActiveMatch");
  try {
    await fn({ matchId: matchId.trim() });
  } catch (e) {
    throw new Error(parseCallableError(e));
  }
}

export type GameSessionPayload = {
  schemaVersion: number;
  mode: string;
  status: string;
  playerUids: string[];
  matchId: string;
};

export async function callGetGameSession(sessionId: string): Promise<GameSessionPayload> {
  const fn = httpsCallable<{ sessionId: string }, { ok: boolean; session: GameSessionPayload }>(
    functions,
    "getGameSession",
  );
  try {
    const res = await fn({ sessionId: sessionId.trim() });
    return res.data.session;
  } catch (e) {
    throw new Error(parseCallableError(e));
  }
}

export async function callReadyCheck(
  matchId: string,
  ready: boolean
): Promise<{ ok: boolean; match: JoinQueueResponse["match"]; sessionId?: string; allReady: boolean }> {
  const fn = httpsCallable<
    { matchId: string; ready: boolean },
    { ok: boolean; match: NonNullable<JoinQueueResponse["match"]>; sessionId?: string; allReady: boolean }
  >(functions, "readyCheck");
  try {
    const res = await fn({ matchId, ready });
    return res.data;
  } catch (e) {
    throw new Error(parseCallableError(e));
  }
}
