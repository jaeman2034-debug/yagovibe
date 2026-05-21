import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type TeamLineupPlayer = {
  memberId: string;
  name: string;
  position: string;
  jerseyNumber?: number;
};

export type CreateTeamLineupInput = {
  name: string;
  date: string;
  formation: string;
  strategy?: "balanced" | "young" | "senior";
  opponentName?: string;
  starters: TeamLineupPlayer[];
  subs: TeamLineupPlayer[];
  availableMap?: Record<string, boolean>;
};

export type TeamLineupDoc = {
  id: string;
  name: string;
  date: string;
  formation: string;
  strategy?: "balanced" | "young" | "senior";
  opponentName?: string;
  starters: TeamLineupPlayer[];
  subs: TeamLineupPlayer[];
  availableMap: Record<string, boolean>;
  createdAt?: unknown;
};

export type LineupResponseStatus = "attending" | "absent";

export type LineupResponseDoc = {
  status: LineupResponseStatus;
  updatedAt?: unknown;
};

export type LineupViewerDoc = {
  viewedAt?: unknown;
};

export type SendLineupRemindersResult = {
  sent: number;
  skipped: number;
};

export type LineupReminderDoc = {
  sentAt?: unknown;
};

function normalizeAvailableMap(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const entries = Object.entries(raw as Record<string, unknown>).filter(
    ([key, value]) => typeof key === "string" && key.length > 0 && typeof value === "boolean"
  );
  return Object.fromEntries(entries);
}

function cleanLineupPlayer(raw: unknown): {
  memberId: string;
  name: string;
  position: string;
  jerseyNumber: number | null;
} {
  const player = (raw ?? {}) as Record<string, unknown>;
  const memberIdRaw = player.memberId ?? player.id ?? "";
  const memberId = String(memberIdRaw || "").trim();
  const name = String(player.name || "").trim();
  const position = String(player.position || "").trim().toUpperCase() || "MF";
  const jerseyNumber =
    typeof player.jerseyNumber === "number" && Number.isFinite(player.jerseyNumber)
      ? Math.trunc(player.jerseyNumber)
      : null;

  return {
    memberId,
    name,
    position,
    jerseyNumber,
  };
}

function cleanLineupPlayers(raw: unknown): Array<{
  memberId: string;
  name: string;
  position: string;
  jerseyNumber: number | null;
}> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => cleanLineupPlayer(p))
    .filter((p) => p.memberId.length > 0 && p.name.length > 0);
}

function normalizeStoredPlayers(raw: unknown): TeamLineupPlayer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      const row = cleanLineupPlayer(p);
      if (!row.memberId || !row.name) return null;
      return {
        memberId: row.memberId,
        name: row.name,
        position: row.position,
        jerseyNumber: typeof row.jerseyNumber === "number" ? row.jerseyNumber : undefined,
      } as TeamLineupPlayer;
    })
    .filter((v): v is TeamLineupPlayer => v !== null);
}

function cleanOpponentName(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  return s.slice(0, 80);
}

export async function createTeamLineup(teamId: string, input: CreateTeamLineupInput): Promise<string> {
  if (!teamId.trim()) throw new Error("teamId가 필요합니다.");

  const opponentName = cleanOpponentName(input.opponentName);
  const payload = {
    name: String(input.name || "").trim(),
    date: String(input.date || "").trim(),
    formation: String(input.formation || "4-4-2").trim(),
    strategy:
      input.strategy === "young" || input.strategy === "senior" || input.strategy === "balanced"
        ? input.strategy
        : "balanced",
    starters: cleanLineupPlayers(input.starters),
    subs: cleanLineupPlayers(input.subs),
    availableMap: normalizeAvailableMap(input.availableMap),
    ...(opponentName ? { opponentName } : {}),
    createdAt: serverTimestamp(),
  };

  console.log("[teamLineupService] create payload", payload);
  const docRef = await addDoc(collection(db, "teams", teamId, "lineups"), {
    ...payload,
  });
  return docRef.id;
}

export async function getTeamLineups(teamId: string): Promise<TeamLineupDoc[]> {
  if (!teamId.trim()) return [];
  const q = query(collection(db, "teams", teamId, "lineups"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      name: String(data.name || ""),
      date: String(data.date || ""),
      formation: String(data.formation || ""),
      strategy:
        data.strategy === "young" || data.strategy === "senior" || data.strategy === "balanced"
          ? data.strategy
          : undefined,
      opponentName: cleanOpponentName(data.opponentName),
      starters: normalizeStoredPlayers(data.starters),
      subs: normalizeStoredPlayers(data.subs),
      availableMap: normalizeAvailableMap(data.availableMap),
      createdAt: data.createdAt,
    };
  });
}

export async function getTeamLineup(teamId: string, lineupId: string): Promise<TeamLineupDoc | null> {
  if (!teamId.trim() || !lineupId.trim()) return null;
  const ref = doc(db, "teams", teamId, "lineups", lineupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    name: String(data.name || ""),
    date: String(data.date || ""),
    formation: String(data.formation || ""),
    strategy:
      data.strategy === "young" || data.strategy === "senior" || data.strategy === "balanced"
        ? data.strategy
        : undefined,
    opponentName: cleanOpponentName(data.opponentName),
    starters: normalizeStoredPlayers(data.starters),
    subs: normalizeStoredPlayers(data.subs),
    availableMap: normalizeAvailableMap(data.availableMap),
    createdAt: data.createdAt,
  };
}

export async function deleteTeamLineup(teamId: string, lineupId: string): Promise<void> {
  if (!teamId.trim() || !lineupId.trim()) throw new Error("teamId/lineupId가 필요합니다.");
  await deleteDoc(doc(db, "teams", teamId, "lineups", lineupId));
}

export async function duplicateTeamLineup(teamId: string, lineupId: string): Promise<string> {
  if (!teamId.trim() || !lineupId.trim()) throw new Error("teamId/lineupId가 필요합니다.");
  const source = await getTeamLineup(teamId, lineupId);
  if (!source) throw new Error("복제할 라인업을 찾을 수 없습니다.");

  const docRef = await addDoc(collection(db, "teams", teamId, "lineups"), {
    name: `${source.name || "라인업"} (복사)`,
    date: source.date || "",
    formation: source.formation || "",
    strategy: source.strategy || "balanced",
    ...(source.opponentName ? { opponentName: source.opponentName } : {}),
    starters: source.starters || [],
    subs: source.subs || [],
    availableMap: source.availableMap || {},
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function setLineupResponse(
  teamId: string,
  lineupId: string,
  userId: string,
  status: LineupResponseStatus
): Promise<void> {
  const normalizedTeamId = teamId.trim();
  const normalizedLineupId = lineupId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedTeamId || !normalizedLineupId || !normalizedUserId) {
    throw new Error("teamId/lineupId/userId가 필요합니다.");
  }

  const ref = doc(db, "teams", normalizedTeamId, "lineups", normalizedLineupId, "responses", normalizedUserId);
  await setDoc(
    ref,
    {
      status,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeLineupResponses(
  teamId: string,
  lineupId: string,
  callback: (data: Record<string, LineupResponseDoc>) => void
): () => void {
  const normalizedTeamId = teamId.trim();
  const normalizedLineupId = lineupId.trim();
  if (!normalizedTeamId || !normalizedLineupId) {
    callback({});
    return () => {};
  }

  const colRef = collection(db, "teams", normalizedTeamId, "lineups", normalizedLineupId, "responses");
  return onSnapshot(colRef, (snap) => {
    const result: Record<string, LineupResponseDoc> = {};
    snap.forEach((row) => {
      const data = row.data() as Record<string, unknown>;
      const status = data.status === "attending" || data.status === "absent" ? data.status : null;
      if (!status) return;
      result[row.id] = {
        status,
        updatedAt: data.updatedAt,
      };
    });
    callback(result);
  });
}

export async function setLineupViewerOnce(teamId: string, lineupId: string, userId: string): Promise<void> {
  const normalizedTeamId = teamId.trim();
  const normalizedLineupId = lineupId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedTeamId || !normalizedLineupId || !normalizedUserId) return;

  const ref = doc(db, "teams", normalizedTeamId, "lineups", normalizedLineupId, "viewers", normalizedUserId);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    viewedAt: serverTimestamp(),
  });
}

export function subscribeLineupViewers(
  teamId: string,
  lineupId: string,
  callback: (data: Record<string, LineupViewerDoc>) => void
): () => void {
  const normalizedTeamId = teamId.trim();
  const normalizedLineupId = lineupId.trim();
  if (!normalizedTeamId || !normalizedLineupId) {
    callback({});
    return () => {};
  }

  const colRef = collection(db, "teams", normalizedTeamId, "lineups", normalizedLineupId, "viewers");
  return onSnapshot(colRef, (snap) => {
    const result: Record<string, LineupViewerDoc> = {};
    snap.forEach((row) => {
      const data = row.data() as Record<string, unknown>;
      result[row.id] = {
        viewedAt: data.viewedAt,
      };
    });
    callback(result);
  });
}

export async function sendLineupReminders(
  teamId: string,
  lineupId: string,
  userIds: string[]
): Promise<SendLineupRemindersResult> {
  const normalizedTeamId = teamId.trim();
  const normalizedLineupId = lineupId.trim();
  if (!normalizedTeamId || !normalizedLineupId) {
    throw new Error("teamId/lineupId가 필요합니다.");
  }

  const uniqueIds = Array.from(new Set(userIds.map((id) => id.trim()).filter((id) => id.length > 0)));
  if (uniqueIds.length === 0) return { sent: 0, skipped: 0 };

  if (uniqueIds.length === 0) return { sent: 0, skipped: 0 };

  for (let i = 0; i < uniqueIds.length; i += 400) {
    const chunk = uniqueIds.slice(i, i + 400);
    const batch = writeBatch(db);
    chunk.forEach((uid) => {
      const ref = doc(db, "teams", normalizedTeamId, "lineups", normalizedLineupId, "reminders", uid);
      batch.set(ref, { sentAt: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  }

  return { sent: uniqueIds.length, skipped: 0 };
}

export function subscribeLineupReminders(
  teamId: string,
  lineupId: string,
  callback: (data: Record<string, LineupReminderDoc>) => void
): () => void {
  const normalizedTeamId = teamId.trim();
  const normalizedLineupId = lineupId.trim();
  if (!normalizedTeamId || !normalizedLineupId) {
    callback({});
    return () => {};
  }

  const colRef = collection(db, "teams", normalizedTeamId, "lineups", normalizedLineupId, "reminders");
  return onSnapshot(colRef, (snap) => {
    const result: Record<string, LineupReminderDoc> = {};
    snap.forEach((row) => {
      const data = row.data() as Record<string, unknown>;
      result[row.id] = {
        sentAt: data.sentAt,
      };
    });
    callback(result);
  });
}

