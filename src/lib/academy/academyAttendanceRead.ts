/**
 * Phase A A2-6 — PURE READ academy attendance.
 *
 * READ STRATEGY (locked):
 * - Primary: Firestore `teams/{teamId}/sessions/{sessionId}/attendance`.
 * - Fallback: `getAcademySessionAttendance` callable (server-side persona filter).
 * - Caller applies `filterAttendanceForViewer` when using client path.
 */

import { collection, getDocs, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { callGetAcademySessionAttendance } from "@/lib/academy/academySessionReadCallables";
import type {
  AcademyAttendanceRow,
  AcademyAttendanceStatus,
} from "@/lib/academy/academyAttendanceReadTypes";

export type { AcademyAttendanceRow, AcademyAttendanceStatus } from "@/lib/academy/academyAttendanceReadTypes";

function parseAttendanceStatus(raw: unknown): AcademyAttendanceStatus {
  const s = String(raw ?? "");
  if (s === "present" || s === "absent" || s === "late" || s === "excused") return s;
  return "absent";
}

export function mapAttendanceDocToRow(
  targetUid: string,
  teamId: string,
  sessionId: string,
  data: Record<string, unknown>
): AcademyAttendanceRow {
  return {
    targetUid,
    teamId,
    sessionId,
    status: parseAttendanceStatus(data.status),
    markedBy: typeof data.markedBy === "string" ? data.markedBy : undefined,
    markedAt: data.markedAt,
    note: typeof data.note === "string" ? data.note : null,
  };
}

function mapSnap(
  teamId: string,
  sessionId: string,
  docSnap: QueryDocumentSnapshot<DocumentData>
): AcademyAttendanceRow {
  return mapAttendanceDocToRow(
    docSnap.id,
    teamId,
    sessionId,
    docSnap.data() as Record<string, unknown>
  );
}

function isFirestorePermissionError(e: unknown): boolean {
  const code =
    e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
  return code === "permission-denied" || code.includes("permission");
}

/**
 * All attendance rows for a session (unfiltered — apply selectors at UI boundary).
 */
export async function readAttendanceForSession(
  teamId: string,
  sessionId: string
): Promise<AcademyAttendanceRow[]> {
  if (!teamId.trim() || !sessionId.trim()) return [];

  try {
    const col = collection(db, "teams", teamId, "sessions", sessionId, "attendance");
    const snap = await getDocs(col);
    return snap.docs.map((d) => mapSnap(teamId, sessionId, d));
  } catch (e) {
    if (!isFirestorePermissionError(e)) throw e;
    return callGetAcademySessionAttendance({ teamId, sessionId });
  }
}
