import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { AcademyAttendanceStatus } from "@/lib/academy/academyAttendanceReadTypes";

export type MarkAcademyAttendancePayload = {
  teamId: string;
  sessionId: string;
  targetUid: string;
  status: AcademyAttendanceStatus;
  note?: string;
};

export type MarkAcademyAttendanceResult = {
  ok: true;
  teamId: string;
  sessionId: string;
  targetUid: string;
  status: string;
  markedBy: string;
  markedAt: number;
};

export type BulkMarkAcademyAttendancePayload = {
  teamId: string;
  sessionId: string;
  updates: Array<{ targetUid: string; status: AcademyAttendanceStatus }>;
};

export type BulkMarkAcademyAttendanceResult = {
  ok: true;
  teamId: string;
  sessionId: string;
  succeeded: Array<{ targetUid: string; status: string }>;
  failed: Array<{ targetUid: string; code: string; message?: string }>;
  markedBy: string;
  markedAt: number;
};

export async function callMarkAcademyAttendance(
  payload: MarkAcademyAttendancePayload
): Promise<MarkAcademyAttendanceResult> {
  const fn = httpsCallable<MarkAcademyAttendancePayload, MarkAcademyAttendanceResult>(
    functions,
    "markAcademyAttendance"
  );
  const res = await fn(payload);
  return res.data;
}

export async function callBulkMarkAcademyAttendance(
  payload: BulkMarkAcademyAttendancePayload
): Promise<BulkMarkAcademyAttendanceResult> {
  const fn = httpsCallable<BulkMarkAcademyAttendancePayload, BulkMarkAcademyAttendanceResult>(
    functions,
    "bulkMarkAcademyAttendance"
  );
  const res = await fn(payload);
  return res.data;
}
