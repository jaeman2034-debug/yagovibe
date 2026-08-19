/**
 * Phase A A2-6 — PURE READ academy sessions.
 *
 * READ STRATEGY (locked):
 * - Primary: Firestore client query on `teams/{teamId}/sessions` (rules: active member read).
 * - Fallback: `listAcademySessions` callable adapter if client read fails (permission-denied).
 * - Writes remain callable-only (A2-6-1); this module never mutates.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { callListAcademySessions } from "@/lib/academy/academySessionReadCallables";
import type { AcademySessionRow, AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";

export type { AcademySessionRow, AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";

function parseSessionStatus(raw: unknown): AcademySessionStatus {
  const s = String(raw ?? "scheduled");
  if (s === "open" || s === "closed" || s === "cancelled" || s === "scheduled") {
    return s;
  }
  return "scheduled";
}

export function mapSessionDocToRow(
  sessionId: string,
  teamId: string,
  data: Record<string, unknown>
): AcademySessionRow {
  return {
    sessionId,
    teamId,
    title: String(data.title ?? ""),
    startsAt: data.startsAt,
    endsAt: data.endsAt ?? null,
    status: parseSessionStatus(data.status),
    createdBy: String(data.createdBy ?? ""),
    coachUid: typeof data.coachUid === "string" ? data.coachUid : null,
    notes: typeof data.notes === "string" ? data.notes : null,
    cancelledBy: typeof data.cancelledBy === "string" ? data.cancelledBy : undefined,
    cancelledAt: data.cancelledAt,
  };
}

function mapSnap(teamId: string, docSnap: QueryDocumentSnapshot<DocumentData>): AcademySessionRow {
  return mapSessionDocToRow(docSnap.id, teamId, docSnap.data() as Record<string, unknown>);
}

function isFirestorePermissionError(e: unknown): boolean {
  const code =
    e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
  return code === "permission-denied" || code.includes("permission");
}

/**
 * List academy sessions for a team (newest first).
 */
export async function readAcademySessionsForTeam(
  teamId: string,
  opts?: { limit?: number }
): Promise<AcademySessionRow[]> {
  if (!teamId.trim()) return [];
  const take = opts?.limit ?? 50;

  try {
    const col = collection(db, "teams", teamId, "sessions");
    const q = query(col, orderBy("startsAt", "desc"), limit(take));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapSnap(teamId, d));
  } catch (e) {
    if (!isFirestorePermissionError(e)) throw e;
    const sessions = await callListAcademySessions({ teamId, limit: take });
    return sessions.map((s) => ({
      ...s,
      teamId,
      sessionId: s.sessionId,
    }));
  }
}

/**
 * Single session by id (client read).
 */
export async function readAcademySessionById(
  teamId: string,
  sessionId: string
): Promise<AcademySessionRow | null> {
  if (!teamId.trim() || !sessionId.trim()) return null;
  try {
    const ref = doc(db, "teams", teamId, "sessions", sessionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return mapSessionDocToRow(sessionId, teamId, snap.data() as Record<string, unknown>);
  } catch (e) {
    if (!isFirestorePermissionError(e)) throw e;
    const sessions = await callListAcademySessions({ teamId, limit: 100 });
    return sessions.find((s) => s.sessionId === sessionId) ?? null;
  }
}
