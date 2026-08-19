import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { AcademyMemberRole } from "@/lib/team/academyMemberRole";
import type { ParentRelation } from "@/lib/team/parentLinksReadTypes";

export type InviteParentPayload = {
  teamId: string;
  parentUid: string;
  playerUid: string;
  relation: ParentRelation;
};

export type AcceptParentInvitePayload = {
  teamId: string;
  linkId?: string;
  playerUid?: string;
};

export type RevokeParentLinkPayload = {
  teamId: string;
  linkId: string;
};

export type UpdateAcademyMemberRolePayload = {
  teamId: string;
  targetUid: string;
  nextRole: Exclude<AcademyMemberRole, "owner">;
};

export async function callInviteParent(payload: InviteParentPayload): Promise<void> {
  const fn = httpsCallable<InviteParentPayload, { ok: boolean }>(functions, "inviteParent");
  await fn(payload);
}

export async function callAcceptParentInvite(payload: AcceptParentInvitePayload): Promise<void> {
  const fn = httpsCallable<AcceptParentInvitePayload, { ok: boolean }>(functions, "acceptParentInvite");
  await fn(payload);
}

export async function callRevokeParentLink(payload: RevokeParentLinkPayload): Promise<void> {
  const fn = httpsCallable<RevokeParentLinkPayload, { ok: boolean }>(functions, "revokeParentLink");
  await fn(payload);
}

export async function callUpdateAcademyMemberRole(payload: UpdateAcademyMemberRolePayload): Promise<void> {
  const fn = httpsCallable<UpdateAcademyMemberRolePayload, { ok: boolean }>(
    functions,
    "updateAcademyMemberRole"
  );
  await fn(payload);
}
