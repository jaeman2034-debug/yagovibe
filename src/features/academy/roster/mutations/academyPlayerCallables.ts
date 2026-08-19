import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { ParentRelation } from "@/lib/team/parentLinksReadTypes";

export type CreateAcademyPlayerPayload = {
  teamId: string;
  displayName: string;
  birthDate?: string;
  uniformNumber?: string | number;
  position?: string;
};

export type InviteParentToAcademyPlayerPayload = {
  teamId: string;
  playerId: string;
  parentEmail: string;
  guardianDisplayName?: string;
  relation: ParentRelation;
};

export type InviteAcademyCoachPayload = {
  teamId: string;
  coachEmail: string;
  displayName?: string;
};

export async function callCreateAcademyPlayer(
  payload: CreateAcademyPlayerPayload
): Promise<{ playerId: string; displayName: string }> {
  const fn = httpsCallable<CreateAcademyPlayerPayload, { ok: boolean; playerId: string; displayName: string }>(
    functions,
    "createAcademyPlayer"
  );
  const res = await fn(payload);
  return { playerId: res.data.playerId, displayName: res.data.displayName };
}

export async function callInviteParentToAcademyPlayer(
  payload: InviteParentToAcademyPlayerPayload
): Promise<void> {
  const fn = httpsCallable<InviteParentToAcademyPlayerPayload, { ok: boolean }>(
    functions,
    "inviteParentToAcademyPlayer"
  );
  await fn(payload);
}

export async function callInviteAcademyCoachByEmail(payload: InviteAcademyCoachPayload): Promise<void> {
  const fn = httpsCallable<InviteAcademyCoachPayload, { ok: boolean }>(functions, "inviteAcademyCoachByEmail");
  await fn(payload);
}
