import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type PreviewTeamMemberInviteResult = {
  found: boolean;
  teamId?: string;
  teamName?: string;
  reason?: string;
  expiresAtMs?: number;
};

export async function callPreviewTeamMemberInvite(inviteId: string): Promise<PreviewTeamMemberInviteResult> {
  const fn = httpsCallable<{ inviteId: string }, PreviewTeamMemberInviteResult>(
    functions,
    "previewTeamMemberInvite"
  );
  const res = await fn({ inviteId: inviteId.trim() });
  return res.data as PreviewTeamMemberInviteResult;
}

export type ClaimTeamMemberInviteResult = {
  linked: number;
  skipped: number;
  alreadyAccepted?: boolean;
};

export async function callClaimTeamMemberInvite(inviteId: string): Promise<ClaimTeamMemberInviteResult> {
  const fn = httpsCallable<{ inviteId: string }, ClaimTeamMemberInviteResult>(
    functions,
    "claimTeamMemberInvite"
  );
  const res = await fn({ inviteId: inviteId.trim() });
  return res.data as ClaimTeamMemberInviteResult;
}

export type CreateTeamMemberInviteResult = {
  inviteId: string;
  inviteUrl: string;
  smsSent: boolean;
};

export async function callCreateTeamMemberInvite(payload: {
  teamId: string;
  memberId: string;
  sendSms?: boolean;
}): Promise<CreateTeamMemberInviteResult> {
  const fn = httpsCallable<
    { teamId: string; memberId: string; sendSms?: boolean },
    CreateTeamMemberInviteResult
  >(functions, "createTeamMemberInvite");
  const res = await fn({
    teamId: payload.teamId.trim(),
    memberId: payload.memberId.trim(),
    sendSms: payload.sendSms,
  });
  return res.data as CreateTeamMemberInviteResult;
}
