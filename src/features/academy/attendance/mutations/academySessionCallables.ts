import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";

export type CreateAcademySessionPayload = {
  teamId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  coachUid?: string;
  notes?: string;
};

export type CreateAcademySessionResult = {
  ok: true;
  teamId: string;
  sessionId: string;
  status: "scheduled";
  createdBy: string;
  createdAt: number;
};

export type SessionPatchPayload = {
  title?: string;
  startsAt?: string;
  endsAt?: string | null;
  coachUid?: string | null;
  notes?: string | null;
  status?: "scheduled" | "open" | "closed";
};

export type UpdateAcademySessionPayload = {
  teamId: string;
  sessionId: string;
  patch: SessionPatchPayload;
};

export type UpdateAcademySessionResult = {
  ok: true;
  teamId: string;
  sessionId: string;
  patchApplied: Record<string, unknown>;
  updatedBy: string;
  updatedAt: number;
};

export type CancelAcademySessionPayload = {
  teamId: string;
  sessionId: string;
  reason?: string;
};

export type CancelAcademySessionResult = {
  ok: true;
  teamId: string;
  sessionId: string;
  status: "cancelled";
  cancelledBy: string;
  cancelledAt: number;
  reason?: string;
};

export async function callCreateAcademySession(
  payload: CreateAcademySessionPayload
): Promise<CreateAcademySessionResult> {
  const fn = httpsCallable<CreateAcademySessionPayload, CreateAcademySessionResult>(
    functions,
    "createAcademySession"
  );
  const res = await fn(payload);
  return res.data;
}

export async function callUpdateAcademySession(
  payload: UpdateAcademySessionPayload
): Promise<UpdateAcademySessionResult> {
  const fn = httpsCallable<UpdateAcademySessionPayload, UpdateAcademySessionResult>(
    functions,
    "updateAcademySession"
  );
  const res = await fn(payload);
  return res.data;
}

export async function callCancelAcademySession(
  payload: CancelAcademySessionPayload
): Promise<CancelAcademySessionResult> {
  const fn = httpsCallable<CancelAcademySessionPayload, CancelAcademySessionResult>(
    functions,
    "cancelAcademySession"
  );
  const res = await fn(payload);
  return res.data;
}

export type { AcademySessionStatus };
