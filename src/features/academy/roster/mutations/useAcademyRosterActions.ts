import { useState } from "react";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";
import {
  callAcceptParentInvite,
  callInviteParent,
  callRevokeParentLink,
  callUpdateAcademyMemberRole,
  type AcceptParentInvitePayload,
  type InviteParentPayload,
  type RevokeParentLinkPayload,
  type UpdateAcademyMemberRolePayload,
} from "@/features/academy/roster/mutations/academyRosterCallables";

type Args = {
  refresh: () => Promise<void>;
};

function toMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code.includes("permission-denied")) return "권한이 없습니다.";
    if (error.code.includes("already-exists")) return "이미 연결된 항목입니다.";
    if (error.code.includes("failed-precondition")) return "요청 조건을 만족하지 않습니다.";
    if (error.code.includes("unauthenticated")) return "로그인이 필요합니다.";
    return error.message || "요청 처리 중 오류가 발생했습니다.";
  }
  if (error instanceof Error) return error.message;
  return "요청 처리 중 오류가 발생했습니다.";
}

export function useAcademyRosterActions({ refresh }: Args) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function runMutation(key: string, fn: () => Promise<void>, success: string) {
    setPendingKey(key);
    try {
      await fn();
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error(toMessage(error));
    } finally {
      setPendingKey(null);
    }
  }

  return {
    pendingKey,
    inviteParent: (payload: InviteParentPayload) =>
      runMutation("invite-parent", () => callInviteParent(payload), "보호자 초대를 전송했습니다."),
    acceptParentInvite: (payload: AcceptParentInvitePayload) =>
      runMutation("accept-parent", () => callAcceptParentInvite(payload), "보호자 연결을 수락했습니다."),
    revokeParentLink: (payload: RevokeParentLinkPayload) =>
      runMutation("revoke-parent", () => callRevokeParentLink(payload), "보호자 연결을 해제했습니다."),
    updateRole: (payload: UpdateAcademyMemberRolePayload) =>
      runMutation("update-role", () => callUpdateAcademyMemberRole(payload), "역할을 변경했습니다."),
  };
}
