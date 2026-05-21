import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type InviteTeamMemberByPhonePayload = {
  teamId: string;
  name: string;
  phone: string;
  role?: "member" | "admin";
};

export type InviteTeamMemberByPhoneResult = {
  memberId: string;
  smsSent: boolean;
  /** `teamMemberInvites` 보안 링크 id (있으면 SMS/공유 시 `/invite/{inviteId}`) */
  inviteId?: string;
};

export async function callInviteTeamMemberByPhone(
  payload: InviteTeamMemberByPhonePayload
): Promise<InviteTeamMemberByPhoneResult> {
  const fn = httpsCallable<InviteTeamMemberByPhonePayload, InviteTeamMemberByPhoneResult>(
    functions,
    "inviteTeamMemberByPhone"
  );
  const res = await fn(payload);
  const data = res.data as InviteTeamMemberByPhoneResult;
  return {
    memberId: data.memberId,
    smsSent: Boolean(data.smsSent),
    inviteId: typeof data.inviteId === "string" ? data.inviteId : undefined,
  };
}

export type ClaimPhoneInvitedTeamMembershipsPayload = { teamId?: string };

export type ClaimPhoneInvitedTeamMembershipsResult = {
  linked: number;
  skipped: number;
};

export async function callClaimPhoneInvitedTeamMemberships(
  payload: ClaimPhoneInvitedTeamMembershipsPayload = {}
): Promise<ClaimPhoneInvitedTeamMembershipsResult> {
  const fn = httpsCallable<
    ClaimPhoneInvitedTeamMembershipsPayload,
    ClaimPhoneInvitedTeamMembershipsResult
  >(functions, "claimPhoneInvitedTeamMemberships");
  const res = await fn(payload);
  return res.data as ClaimPhoneInvitedTeamMembershipsResult;
}

export type UpdateInvitedMemberPhonePayload = {
  teamId: string;
  memberDocId: string;
  phone: string;
  name?: string;
  resendSms?: boolean;
  profile?: {
    jerseyNumber?: number | null;
    birthYear?: number | null;
    uniformSize?: string | null;
    position?: string;
    roleDetail?: string;
    duesType?: "monthly" | "yearly" | "exempt";
    yearlyPaidAtMillis?: number | null;
  };
};

export type UpdateInvitedMemberPhoneResult = { ok: boolean; smsSent: boolean };

export async function callUpdateInvitedMemberPhone(
  payload: UpdateInvitedMemberPhonePayload
): Promise<UpdateInvitedMemberPhoneResult> {
  const fn = httpsCallable<UpdateInvitedMemberPhonePayload, UpdateInvitedMemberPhoneResult>(
    functions,
    "updateInvitedMemberPhone"
  );
  const res = await fn(payload);
  return res.data as UpdateInvitedMemberPhoneResult;
}
