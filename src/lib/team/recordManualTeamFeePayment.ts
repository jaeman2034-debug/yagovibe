import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type RecordManualTeamFeePaymentResult = {
  success: boolean;
  alreadyPaid?: boolean;
};

export async function recordManualTeamFeePayment(args: {
  teamId: string;
  feeId: string;
  targetUid: string;
  /** 온라인 결제 pending 상태인데 오프라인으로 전액 수납했을 때만 true — 스태프 확인 후 전달 */
  confirmOfflineDespiteOnlinePending?: boolean;
}): Promise<RecordManualTeamFeePaymentResult> {
  const callable = httpsCallable(functions, "recordManualTeamFeePayment");
  const res = await callable(args);
  const data = res.data as Record<string, unknown> | undefined;
  return {
    success: data?.success === true,
    alreadyPaid: data?.alreadyPaid === true,
  };
}

const DEFAULT_TOAST = "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

/** Callable `recordManualTeamFeePayment` 실패 시 토스트용 문구 (raw internal 방지) */
export function getRecordManualTeamFeePaymentErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const fnCode = error.code.replace(/^functions\//, "");
    const raw = (error.message || "").trim();
    const msg =
      raw.replace(/^Firebase:\s*Error\s*\([^)]+\):\s*/i, "").replace(/^Firebase:\s*/i, "").trim() || raw;

    if (fnCode === "internal" || fnCode === "unknown" || /^internal$/i.test(msg)) {
      return "처리 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }

    if (fnCode === "failed-precondition" && msg.length > 0 && msg.length < 400) {
      return msg;
    }

    switch (fnCode) {
      case "unauthenticated":
        return "로그인이 필요합니다.";
      case "permission-denied":
        return msg.length > 0 && msg.length < 200
          ? msg
          : "이 작업을 수행할 권한이 없거나, 대상 멤버가 활성 상태가 아닙니다.";
      case "invalid-argument":
        return msg.length > 0 && msg.length < 200 ? msg : "요청 정보가 올바르지 않습니다.";
      case "not-found":
        return msg.length > 0 && msg.length < 200 ? msg : "회비를 찾을 수 없습니다.";
      case "deadline-exceeded":
        return "응답이 지연되었습니다. 잠시 후 다시 시도해 주세요.";
      case "resource-exhausted":
        return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
      case "unavailable":
        return "서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.";
      default:
        if (msg.length > 0 && msg.length < 400 && !/^internal$/i.test(msg)) {
          return msg;
        }
        return DEFAULT_TOAST;
    }
  }

  if (error instanceof Error) {
    const m = error.message.trim();
    if (m && !/^internal$/i.test(m)) return m;
  }

  return DEFAULT_TOAST;
}
