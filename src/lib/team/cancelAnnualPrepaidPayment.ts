import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type CancelAnnualPrepaidPaymentInput = {
  teamId: string;
  memberId: string;
  annualBatchId?: string;
};

export type CancelAnnualPrepaidPaymentResult = {
  success: boolean;
  annualBatchId: string;
  cancelledCount: number;
  skippedCount: number;
};

export async function cancelAnnualPrepaidPayment(
  input: CancelAnnualPrepaidPaymentInput
): Promise<CancelAnnualPrepaidPaymentResult> {
  const callable = httpsCallable<CancelAnnualPrepaidPaymentInput, CancelAnnualPrepaidPaymentResult>(
    functions,
    "cancelAnnualPrepaidPayment"
  );
  const res = await callable(input);
  return res.data;
}

const DEFAULT_TOAST = "연납 취소 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

export function getCancelAnnualPrepaidPaymentErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const fnCode = error.code.replace(/^functions\//, "");
    const raw = (error.message || "").trim();
    const msg =
      raw.replace(/^Firebase:\s*Error\s*\([^)]+\):\s*/i, "").replace(/^Firebase:\s*/i, "").trim() || raw;
    if (fnCode === "internal" || fnCode === "unknown" || /^internal$/i.test(msg)) {
      return "서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (msg.length > 0 && msg.length < 300) return msg;
    return DEFAULT_TOAST;
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return DEFAULT_TOAST;
}
