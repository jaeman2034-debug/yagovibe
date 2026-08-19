/**
 * Phase A A2-6 — READ-ONLY callable adapters (no writes).
 * Use when Firestore client read is rules-blocked; primary path is Firestore in read modules.
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { AcademySessionRow } from "@/lib/academy/academySessionReadTypes";
import type { AcademyAttendanceRow } from "@/lib/academy/academyAttendanceReadTypes";

export type ListAcademySessionsPayload = {
  teamId: string;
  limit?: number;
};

export type ListAcademySessionsResult = {
  ok: boolean;
  teamId: string;
  sessions: AcademySessionRow[];
};

export type GetAcademySessionAttendancePayload = {
  teamId: string;
  sessionId: string;
};

export type GetAcademySessionAttendanceResult = {
  ok: boolean;
  teamId: string;
  sessionId: string;
  attendance: AcademyAttendanceRow[];
};

export async function callListAcademySessions(
  payload: ListAcademySessionsPayload
): Promise<AcademySessionRow[]> {
  const fn = httpsCallable<ListAcademySessionsPayload, ListAcademySessionsResult>(
    functions,
    "listAcademySessions"
  );
  const res = await fn(payload);
  return res.data.sessions ?? [];
}

export async function callGetAcademySessionAttendance(
  payload: GetAcademySessionAttendancePayload
): Promise<AcademyAttendanceRow[]> {
  const fn = httpsCallable<GetAcademySessionAttendancePayload, GetAcademySessionAttendanceResult>(
    functions,
    "getAcademySessionAttendance"
  );
  const res = await fn(payload);
  const rows = res.data.attendance ?? [];
  return rows.map((r) => ({
    ...r,
    teamId: payload.teamId,
    sessionId: payload.sessionId,
  }));
}
