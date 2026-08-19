import { useState } from "react";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";
import {
  callCancelAcademySession,
  callCreateAcademySession,
  callUpdateAcademySession,
  type SessionPatchPayload,
} from "@/features/academy/attendance/mutations/academySessionCallables";

type Args = {
  refresh: () => Promise<void>;
};

function sessionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    if (error.code.includes("permission-denied")) return "권한이 없습니다.";
    if (error.code.includes("failed-precondition")) return error.message || fallback;
    if (error.code.includes("unauthenticated")) return "로그인이 필요합니다.";
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useAcademySessionActions({ refresh }: Args) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function runMutation(key: string, fn: () => Promise<void>, success: string, fallback: string) {
    setPendingKey(key);
    try {
      await fn();
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error(sessionErrorMessage(error, fallback));
      throw error;
    } finally {
      setPendingKey(null);
    }
  }

  return {
    pendingKey,
    createSession: (args: {
      teamId: string;
      title: string;
      startsAt: string;
      endsAt?: string;
      notes?: string;
      openImmediately?: boolean;
    }) =>
      runMutation(
        "create-session",
        async () => {
          const created = await callCreateAcademySession({
            teamId: args.teamId,
            title: args.title,
            startsAt: args.startsAt,
            ...(args.endsAt ? { endsAt: args.endsAt } : {}),
            ...(args.notes ? { notes: args.notes } : {}),
          });
          if (args.openImmediately) {
            await callUpdateAcademySession({
              teamId: args.teamId,
              sessionId: created.sessionId,
              patch: { status: "open" },
            });
          }
        },
        "훈련 세션이 생성되었습니다.",
        "세션 생성에 실패했습니다."
      ),
    updateSession: (args: { teamId: string; sessionId: string; patch: SessionPatchPayload }) =>
      runMutation(
        `update-${args.sessionId}`,
        () =>
          callUpdateAcademySession({
            teamId: args.teamId,
            sessionId: args.sessionId,
            patch: args.patch,
          }).then(() => undefined),
        "훈련 세션이 수정되었습니다.",
        "세션 수정에 실패했습니다."
      ),
    cancelSession: (args: { teamId: string; sessionId: string; reason?: string }) =>
      runMutation(
        `cancel-${args.sessionId}`,
        () =>
          callCancelAcademySession({
            teamId: args.teamId,
            sessionId: args.sessionId,
            ...(args.reason ? { reason: args.reason } : {}),
          }).then(() => undefined),
        "훈련 세션이 취소되었습니다.",
        "세션 취소에 실패했습니다."
      ),
  };
}
