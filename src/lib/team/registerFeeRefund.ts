import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type RegisterFeeRefundInput = {
  teamId: string;
  feeId: string;
  /** 납부자 UID (`teams/.../payments` 조인 키와 동일) */
  memberId: string;
  refundAmountWon: number;
  reason: string;
  idempotencyKey?: string;
};

export type RegisterFeeRefundResult = {
  success: boolean;
  duplicate?: boolean;
  refundId?: string;
  originalPaymentDocId?: string;
  refundAmountWon?: number;
  /** 출납부 지출 행 반영 여부 — 실패 시 재호출(동일 멱등 키)으로 보정 가능 */
  cashBookSynced?: boolean;
};

export async function registerFeeRefund(input: RegisterFeeRefundInput): Promise<RegisterFeeRefundResult> {
  const callable = httpsCallable<RegisterFeeRefundInput, RegisterFeeRefundResult>(functions, "registerFeeRefund");
  const res = await callable(input);
  return res.data;
}

const DEFAULT_TOAST = "환불 기록 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

export function getRegisterFeeRefundErrorMessage(error: unknown): string {
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
