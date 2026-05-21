import { randomUUID } from "crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { getApps, initializeApp } from "firebase-admin/app";
import {
  FORMATION_LOCK_MS,
  isMatchmakingMode,
  MATCH_READY_TTL_MS,
  playersRequiredForMode,
  QUEUE_ENTRY_TTL_MS,
  type MatchmakingMode,
} from "./constants";
import {
  formationLockPath,
  matchPath,
  presencePath,
  queueEntriesPath,
  queueEntryPath,
  queueMetaPath,
} from "./rtdbPaths";

const DATABASE_URL =
  process.env.RTDB_DATABASE_URL?.trim() ||
  "https://yago-vibe-spt-default-rtdb.asia-southeast1.firebasedatabase.app";

function rtdb() {
  if (!getApps().length) {
    initializeApp({ databaseURL: DATABASE_URL });
  }
  return getDatabase();
}

export type QueueEntry = {
  uid: string;
  displayName: string;
  joinedAt: number;
  expiresAt: number;
  clientId: string;
  teamId?: string | null;
  status: "waiting";
};

export type MatchPlayerState = {
  uid: string;
  displayName: string;
  ready: boolean;
};

export type MatchFoundState = {
  matchId: string;
  mode: MatchmakingMode;
  status: "found" | "ready" | "starting" | "started" | "cancelled";
  players: Record<string, MatchPlayerState>;
  sessionId?: string | null;
  createdAt: number;
  expiresAt: number;
};

export class MatchmakingError extends Error {
  constructor(
    message: string,
    readonly code:
      | "IN_QUEUE_OTHER_TAB"
      | "ALREADY_IN_QUEUE"
      | "MATCH_NOT_FOUND"
      | "NOT_IN_MATCH"
      | "MATCH_CANCELLED"
      | "MATCH_EXPIRED"
  ) {
    super(message);
    this.name = "MatchmakingError";
  }
}

function displayNameFromAuth(token: { name?: string; email?: string } | undefined, uid: string): string {
  const n = typeof token?.name === "string" ? token.name.trim() : "";
  if (n) return n.slice(0, 40);
  const e = typeof token?.email === "string" ? token.email.split("@")[0]?.trim() : "";
  if (e) return e.slice(0, 40);
  return `Player ${uid.slice(0, 6)}`;
}

async function recountQueueMeta(mode: MatchmakingMode): Promise<number> {
  const snap = await rtdb().ref(queueEntriesPath(mode)).get();
  const now = Date.now();
  let count = 0;
  if (snap.exists()) {
    const entries = snap.val() as Record<string, QueueEntry>;
    count = Object.values(entries).filter((e) => typeof e.expiresAt === "number" && e.expiresAt > now).length;
  }
  await rtdb().ref(queueMetaPath(mode)).set({ count, updatedAt: Date.now() });
  return count;
}

/** 만료 큐 항목 제거 + meta 정합 */
export async function pruneStaleQueueEntries(mode: MatchmakingMode): Promise<void> {
  const db = rtdb();
  const snap = await db.ref(queueEntriesPath(mode)).get();
  if (!snap.exists()) {
    await db.ref(queueMetaPath(mode)).set({ count: 0, updatedAt: Date.now() });
    return;
  }
  const now = Date.now();
  const entries = snap.val() as Record<string, QueueEntry>;
  const updates: Record<string, null> = {};
  for (const [uid, e] of Object.entries(entries)) {
    if (!e || typeof e.expiresAt !== "number" || e.expiresAt <= now) {
      updates[queueEntryPath(mode, uid)] = null;
    }
  }
  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }
  await recountQueueMeta(mode);
}

async function cancelMatchIfExpired(matchId: string, match: MatchFoundState): Promise<MatchFoundState> {
  if (match.status === "cancelled") return match;
  if (Date.now() <= match.expiresAt) return match;
  const cancelled: MatchFoundState = { ...match, status: "cancelled" };
  await rtdb().ref(matchPath(matchId)).set(cancelled);
  for (const uid of Object.keys(match.players)) {
    await rtdb().ref(presencePath(uid)).update({ activeMatchId: null });
  }
  return cancelled;
}

async function findActiveMatchForUid(uid: string): Promise<MatchFoundState | null> {
  const pres = await rtdb().ref(presencePath(uid)).get();
  const matchId = typeof pres.val()?.activeMatchId === "string" ? pres.val().activeMatchId.trim() : "";
  if (!matchId) return null;
  const snap = await rtdb().ref(matchPath(matchId)).get();
  if (!snap.exists()) {
    await rtdb().ref(presencePath(uid)).update({ activeMatchId: null });
    return null;
  }
  const match = await cancelMatchIfExpired(matchId, snap.val() as MatchFoundState);
  if (match.status === "cancelled" || !match.players?.[uid]) return null;
  return match;
}

async function findQueueEntryForUid(uid: string): Promise<{ mode: MatchmakingMode; entry: QueueEntry } | null> {
  const now = Date.now();
  for (const mode of ["1v1", "5v5", "8v8"] as const) {
    const snap = await rtdb().ref(queueEntryPath(mode, uid)).get();
    if (!snap.exists()) continue;
    const entry = snap.val() as QueueEntry;
    if (typeof entry.expiresAt === "number" && entry.expiresAt <= now) {
      await rtdb().ref(queueEntryPath(mode, uid)).remove();
      continue;
    }
    return { mode, entry };
  }
  return null;
}

export async function joinMatchmakingQueue(input: {
  uid: string;
  mode: MatchmakingMode;
  displayName: string;
  clientId: string;
  teamId?: string | null;
}): Promise<{
  status: "queued" | "match_found";
  mode: MatchmakingMode;
  queuePosition?: number;
  estimatedWaitSec?: number;
  match?: MatchFoundState;
}> {
  const { uid, mode, displayName, teamId } = input;
  const clientId = input.clientId.trim();
  if (!clientId) throw new MatchmakingError("clientId가 필요합니다.", "ALREADY_IN_QUEUE");

  await pruneStaleQueueEntries(mode);

  const existingMatch = await findActiveMatchForUid(uid);
  if (existingMatch) {
    return { status: "match_found", mode: existingMatch.mode, match: existingMatch };
  }

  const otherQueue = await findQueueEntryForUid(uid);
  if (otherQueue && otherQueue.mode !== mode) {
    await leaveMatchmakingQueue(uid, otherQueue.mode);
  }

  const db = rtdb();
  const entryRef = db.ref(queueEntryPath(mode, uid));
  const existing = await entryRef.get();
  const now = Date.now();

  if (existing.exists()) {
    const prev = existing.val() as QueueEntry;
    if (prev.clientId !== clientId) {
      throw new MatchmakingError(
        "다른 탭/기기에서 이미 큐에 있습니다. 해당 탭을 닫거나 큐를 나간 뒤 다시 시도하세요.",
        "IN_QUEUE_OTHER_TAB"
      );
    }
    await entryRef.update({
      displayName,
      joinedAt: now,
      expiresAt: now + QUEUE_ENTRY_TTL_MS,
      teamId: teamId?.trim() || null,
    });
  } else {
    const entry: QueueEntry = {
      uid,
      displayName,
      joinedAt: now,
      expiresAt: now + QUEUE_ENTRY_TTL_MS,
      clientId,
      teamId: teamId?.trim() || null,
      status: "waiting",
    };
    await entryRef.set(entry);
    await recountQueueMeta(mode);
  }

  await db.ref(presencePath(uid)).update({
    online: true,
    lastSeen: now,
    queueMode: mode,
  });

  const match = await tryCreateMatchFromQueue(mode);
  if (match) {
    return { status: "match_found", mode, match };
  }

  const count = await recountQueueMeta(mode);
  const required = playersRequiredForMode(mode);
  const estimatedWaitSec = Math.max(15, Math.round(((required - count) / Math.max(1, count)) * 45));

  return {
    status: "queued",
    mode,
    queuePosition: count,
    estimatedWaitSec,
  };
}

export async function leaveMatchmakingQueue(uid: string, mode: MatchmakingMode): Promise<void> {
  const db = rtdb();
  const entryRef = db.ref(queueEntryPath(mode, uid));
  const snap = await entryRef.get();
  if (snap.exists()) {
    await entryRef.remove();
    await recountQueueMeta(mode);
  }
  await db.ref(presencePath(uid)).update({
    lastSeen: Date.now(),
    queueMode: null,
  });
}

export async function leaveActiveMatch(uid: string, matchId: string): Promise<void> {
  const ref = rtdb().ref(matchPath(matchId));
  const snap = await ref.get();
  if (!snap.exists()) return;

  const match = snap.val() as MatchFoundState;
  if (!match.players?.[uid]) throw new MatchmakingError("이 매치에 없습니다.", "NOT_IN_MATCH");
  if (match.status === "started" && match.sessionId) {
    throw new MatchmakingError("이미 시작된 매치는 나갈 수 없습니다.", "MATCH_EXPIRED");
  }

  const cancelled: MatchFoundState = { ...match, status: "cancelled" };
  await ref.set(cancelled);

  for (const puid of Object.keys(match.players)) {
    await rtdb().ref(presencePath(puid)).update({
      activeMatchId: null,
      queueMode: null,
      lastSeen: Date.now(),
    });
  }
}

/** 경기 종료 후 리매치 — started 매치도 본인 presence만 해제 (상대 매치 레코드는 유지) */
export async function clearActiveMatchPresence(uid: string, matchId: string): Promise<void> {
  const id = matchId.trim();
  if (!id) throw new MatchmakingError("matchId가 필요합니다.", "MATCH_NOT_FOUND");

  const matchRef = rtdb().ref(matchPath(id));
  const snap = await matchRef.get();
  if (snap.exists()) {
    const match = snap.val() as MatchFoundState;
    if (!match.players?.[uid]) {
      throw new MatchmakingError("이 매치에 없습니다.", "NOT_IN_MATCH");
    }
  }

  await rtdb().ref(presencePath(uid)).update({
    activeMatchId: null,
    queueMode: null,
    lastSeen: Date.now(),
  });
}

export async function getMatchForUid(uid: string, matchId: string): Promise<MatchFoundState | null> {
  const snap = await rtdb().ref(matchPath(matchId)).get();
  if (!snap.exists()) return null;
  const match = await cancelMatchIfExpired(matchId, snap.val() as MatchFoundState);
  if (!match.players?.[uid]) return null;
  return match;
}

async function tryCreateMatchFromQueue(mode: MatchmakingMode): Promise<MatchFoundState | null> {
  await pruneStaleQueueEntries(mode);
  const required = playersRequiredForMode(mode);
  const db = rtdb();
  const lockRef = db.ref(formationLockPath(mode));
  const token = randomUUID();
  const now = Date.now();

  const lockResult = await lockRef.transaction((cur) => {
    if (cur && typeof cur.until === "number" && cur.until > now) {
      return;
    }
    return { until: now + FORMATION_LOCK_MS, token };
  });

  if (!lockResult.committed) return null;
  const lockVal = lockResult.snapshot.val() as { token?: string } | null;
  if (lockVal?.token !== token) return null;

  try {
    const entriesSnap = await db.ref(queueEntriesPath(mode)).get();
    if (!entriesSnap.exists()) return null;

    const entries = Object.values(entriesSnap.val() as Record<string, QueueEntry>)
      .filter((e) => e && typeof e.expiresAt === "number" && e.expiresAt > Date.now())
      .sort((a, b) => a.joinedAt - b.joinedAt);

    if (entries.length < required) return null;

    const picked = entries.slice(0, required);
    const matchId = randomUUID();
    const players: Record<string, MatchPlayerState> = {};
    for (const e of picked) {
      players[e.uid] = { uid: e.uid, displayName: e.displayName, ready: false };
    }

    const match: MatchFoundState = {
      matchId,
      mode,
      status: "found",
      players,
      sessionId: null,
      createdAt: now,
      expiresAt: now + MATCH_READY_TTL_MS,
    };

    const updates: Record<string, unknown> = {
      [matchPath(matchId)]: match,
    };
    for (const e of picked) {
      updates[queueEntryPath(mode, e.uid)] = null;
      updates[`${presencePath(e.uid)}/queueMode`] = null;
      updates[`${presencePath(e.uid)}/activeMatchId`] = matchId;
    }

    await db.ref().update(updates);
    await recountQueueMeta(mode);
    return match;
  } finally {
    const cur = await lockRef.get();
    if (cur.exists() && cur.val()?.token === token) {
      await lockRef.remove();
    }
  }
}

export async function setMatchReady(input: {
  uid: string;
  matchId: string;
  ready: boolean;
}): Promise<{ match: MatchFoundState; sessionId?: string; allReady: boolean }> {
  const { uid, matchId, ready } = input;
  const ref = rtdb().ref(matchPath(matchId));

  const tx1 = await ref.transaction((current) => {
    if (!current) return current;
    const m = current as MatchFoundState;
    if (Date.now() > m.expiresAt) {
      m.status = "cancelled";
      return m;
    }
    if (!m.players?.[uid]) return;
    if (m.status === "cancelled") return m;
    if (m.status === "started" && m.sessionId) return m;

    m.players[uid].ready = ready;
    const allReady = Object.values(m.players).every((p) => p.ready);

    if (allReady && !m.sessionId && m.status !== "starting") {
      m.status = "starting";
    } else if (allReady && m.sessionId) {
      m.status = "started";
    } else if (allReady) {
      /* starting — session pending */
    } else {
      m.status = "ready";
    }
    return m;
  });

  if (!tx1.committed) throw new MatchmakingError("매치 상태를 갱신하지 못했습니다.", "MATCH_NOT_FOUND");

  let match = tx1.snapshot.val() as MatchFoundState;
  if (match.status === "cancelled") throw new MatchmakingError("매치가 만료되었습니다.", "MATCH_CANCELLED");

  if (match.status === "started" && match.sessionId) {
    return { match, sessionId: match.sessionId, allReady: true };
  }

  const allReady = Object.values(match.players).every((p) => p.ready);

  if (allReady && match.status === "starting" && !match.sessionId) {
    const sessionId = await createGameSessionDoc(match);

    const tx2 = await ref.transaction((current) => {
      if (!current) return current;
      const m = current as MatchFoundState;
      if (m.sessionId) return m;
      if (m.status === "cancelled") return m;
      m.sessionId = sessionId;
      m.status = "started";
      return m;
    });

    if (tx2.committed) {
      match = tx2.snapshot.val() as MatchFoundState;
    } else {
      const snap = await ref.get();
      match = snap.val() as MatchFoundState;
    }

    return { match, sessionId: match.sessionId ?? sessionId, allReady: true };
  }

  return { match, sessionId: match.sessionId ?? undefined, allReady };
}

async function createGameSessionDoc(match: MatchFoundState): Promise<string> {
  const sessionId = randomUUID();
  const playerUids = Object.keys(match.players).filter(Boolean).sort();
  if (playerUids.length < 2) {
    throw new MatchmakingError("매치 플레이어 정보가 올바르지 않습니다.", "MATCH_NOT_FOUND");
  }
  const fs = getFirestore();
  await fs.collection("gameSessions").doc(sessionId).set({
    schemaVersion: 1,
    mode: match.mode,
    status: "lobby",
    playerUids,
    matchId: match.matchId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return sessionId;
}

export type GameSessionDoc = {
  schemaVersion: number;
  mode: string;
  status: string;
  playerUids: string[];
  matchId: string;
};

/** 클라이언트 Firestore rules 우회 — 참가자만 Admin으로 검증 후 반환 */
export async function getGameSessionForPlayer(
  uid: string,
  sessionId: string,
): Promise<GameSessionDoc> {
  const id = sessionId.trim();
  if (!id) throw new MatchmakingError("sessionId가 필요합니다.", "MATCH_NOT_FOUND");

  const snap = await getFirestore().collection("gameSessions").doc(id).get();
  if (!snap.exists) {
    throw new MatchmakingError("세션을 찾을 수 없습니다.", "MATCH_NOT_FOUND");
  }

  const data = snap.data() as Partial<GameSessionDoc>;
  const playerUids = Array.isArray(data.playerUids)
    ? data.playerUids.filter((u): u is string => typeof u === "string" && Boolean(u))
    : [];

  if (!playerUids.includes(uid)) {
    throw new MatchmakingError("이 세션의 참가자가 아닙니다.", "NOT_IN_MATCH");
  }

  return {
    schemaVersion: typeof data.schemaVersion === "number" ? data.schemaVersion : 1,
    mode: typeof data.mode === "string" ? data.mode : "5v5",
    status: typeof data.status === "string" ? data.status : "lobby",
    playerUids,
    matchId: typeof data.matchId === "string" ? data.matchId : "",
  };
}

export { displayNameFromAuth, isMatchmakingMode };
