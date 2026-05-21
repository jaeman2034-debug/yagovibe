import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  displayNameFromAuth,
  getGameSessionForPlayer,
  isMatchmakingMode,
  joinMatchmakingQueue,
  clearActiveMatchPresence,
  leaveActiveMatch,
  leaveMatchmakingQueue,
  MatchmakingError,
  setMatchReady,
} from "./matchmaking/matchmakingService";

const REGION = "asia-northeast3";

function mapMatchmakingError(e: unknown): never {
  if (e instanceof MatchmakingError) {
    switch (e.code) {
      case "IN_QUEUE_OTHER_TAB":
        throw new HttpsError("already-exists", e.message);
      case "MATCH_NOT_FOUND":
        throw new HttpsError("not-found", e.message);
      case "NOT_IN_MATCH":
        throw new HttpsError("permission-denied", e.message);
      case "MATCH_CANCELLED":
      case "MATCH_EXPIRED":
        throw new HttpsError("failed-precondition", e.message);
      default:
        throw new HttpsError("failed-precondition", e.message);
    }
  }
  const msg = e instanceof Error ? e.message : String(e);
  throw new HttpsError("internal", msg || "요청 처리에 실패했습니다.");
}

export const joinQueue = onCall({ region: REGION, cors: true, maxInstances: 40 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const mode = request.data?.mode;
  if (!isMatchmakingMode(mode)) throw new HttpsError("invalid-argument", "mode는 1v1, 5v5, 8v8 이어야 합니다.");

  const clientId = typeof request.data?.clientId === "string" ? request.data.clientId.trim() : "";
  if (!clientId || clientId.length < 8) {
    throw new HttpsError("invalid-argument", "유효한 clientId가 필요합니다.");
  }

  const teamId = typeof request.data?.teamId === "string" ? request.data.teamId.trim() : "";
  const displayName = displayNameFromAuth(request.auth?.token, uid);

  try {
    const result = await joinMatchmakingQueue({
      uid,
      mode,
      displayName,
      clientId,
      teamId: teamId || null,
    });
    return { ok: true, ...result };
  } catch (e) {
    mapMatchmakingError(e);
  }
});

export const leaveQueue = onCall({ region: REGION, cors: true, maxInstances: 40 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const mode = request.data?.mode;
  if (!isMatchmakingMode(mode)) throw new HttpsError("invalid-argument", "mode는 1v1, 5v5, 8v8 이어야 합니다.");

  await leaveMatchmakingQueue(uid, mode);
  return { ok: true };
});

export const leaveMatch = onCall({ region: REGION, cors: true, maxInstances: 40 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const matchId = typeof request.data?.matchId === "string" ? request.data.matchId.trim() : "";
  if (!matchId) throw new HttpsError("invalid-argument", "matchId가 필요합니다.");

  try {
    await leaveActiveMatch(uid, matchId);
    return { ok: true };
  } catch (e) {
    mapMatchmakingError(e);
  }
});

/** 경기 종료 후 리매치 — activeMatchId 해제 (이전 세션으로 자동 복귀 방지) */
export const clearActiveMatch = onCall({ region: REGION, cors: true, maxInstances: 40 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const matchId = typeof request.data?.matchId === "string" ? request.data.matchId.trim() : "";
  if (!matchId) throw new HttpsError("invalid-argument", "matchId가 필요합니다.");

  try {
    await clearActiveMatchPresence(uid, matchId);
    return { ok: true };
  } catch (e) {
    mapMatchmakingError(e);
  }
});

export const getGameSession = onCall({ region: REGION, cors: true, maxInstances: 40 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const sessionId = typeof request.data?.sessionId === "string" ? request.data.sessionId.trim() : "";
  if (!sessionId) throw new HttpsError("invalid-argument", "sessionId가 필요합니다.");

  try {
    const session = await getGameSessionForPlayer(uid, sessionId);
    return { ok: true, session };
  } catch (e) {
    mapMatchmakingError(e);
  }
});

export const readyCheck = onCall({ region: REGION, cors: true, maxInstances: 40 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const matchId = typeof request.data?.matchId === "string" ? request.data.matchId.trim() : "";
  if (!matchId) throw new HttpsError("invalid-argument", "matchId가 필요합니다.");

  const ready = request.data?.ready !== false;

  try {
    const result = await setMatchReady({ uid, matchId, ready });
    return { ok: true, ...result };
  } catch (e) {
    mapMatchmakingError(e);
  }
});
