import { useState } from "react";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";
import type { AcademyAttendanceStatus } from "@/lib/academy/academyAttendanceReadTypes";
import {
  callBulkMarkAcademyAttendance,
  callMarkAcademyAttendance,
  type BulkMarkAcademyAttendanceResult,
} from "@/features/academy/attendance/mutations/academyAttendanceCallables";

type Args = {
  refresh: () => Promise<void>;
};

function toMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code.includes("permission-denied")) return "출석을 기록할 권한이 없습니다.";
    if (error.code.includes("failed-precondition")) return "이 세션에는 출석을 기록할 수 없습니다.";
    if (error.code.includes("not-found")) return "대상을 찾을 수 없습니다.";
    if (error.code.includes("unauthenticated")) return "로그인이 필요합니다.";
    return error.message || "출석 기록 중 오류가 발생했습니다.";
  }
  if (error instanceof Error) return error.message;
  return "출석 기록 중 오류가 발생했습니다.";
}

export function useAcademyAttendanceActions({ refresh }: Args) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [lastBulkResult, setLastBulkResult] = useState<BulkMarkAcademyAttendanceResult | null>(null);

  async function runMutation(key: string, fn: () => Promise<void>, success: string) {
    setPendingKey(key);
    try {
      await fn();
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error(toMessage(error));
      throw error;
    } finally {
      setPendingKey(null);
    }
  }

  return {
    pendingKey,
    lastBulkResult,
    clearBulkResult: () => setLastBulkResult(null),
    markAttendance: (args: {
      teamId: string;
      sessionId: string;
      targetUid: string;
      status: AcademyAttendanceStatus;
    }) =>
      runMutation(
        `mark-${args.targetUid}-${args.status}`,
        () =>
          callMarkAcademyAttendance({
            teamId: args.teamId,
            sessionId: args.sessionId,
            targetUid: args.targetUid,
            status: args.status,
          }).then(() => undefined),
        "출석을 저장했습니다."
      ),
    bulkMarkAttendance: (args: {
      teamId: string;
      sessionId: string;
      updates: Array<{ targetUid: string; status: AcademyAttendanceStatus }>;
    }) =>
      runMutation(
        "bulk-mark",
        async () => {
          const result = await callBulkMarkAcademyAttendance(args);
          setLastBulkResult(result);
          if (result.failed.length > 0) {
            toast.warning(
              `일부 저장 실패: 성공 ${result.succeeded.length}건 · 실패 ${result.failed.length}건`
            );
          }
        },
        "일괄 출석을 저장했습니다."
      ),
  };
}
