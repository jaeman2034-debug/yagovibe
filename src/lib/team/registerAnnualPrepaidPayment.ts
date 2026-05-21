import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type RegisterAnnualPrepaidPaymentInput = {
  teamId: string;
  userId: string;
  months: number;
  /** 레거시: `finalAmount` 없을 때 실납부 합계로 사용 */
  totalAmount: number;
  /** 실납부 합계(할인 후) — 분배·KPI 기준 */
  finalAmount?: number;
  /** 정가 합계(할인 전) */
  originalAmount?: number;
  /** 조기 납부 할인 개월 수 (0~months-1) */
  discountMonths?: number;
  /** 할인 적용 유형 */
  discountType?: "NONE" | "EARLY_BIRD" | "MANUAL";
  /** 운영자 수동 override 여부 */
  isOverride?: boolean;
  /** 수동 적용 근거 */
  overrideReason?: string;
  paidAt: Date | string;
  startFeeId?: string;
  startMonth?: string;
};

export type RegisterAnnualPrepaidPaymentResult = {
  success: boolean;
  sourceBulkPaymentId?: string;
  created: number;
  skipped: number;
  totalAllocated: number;
  skippedAllocated?: number;
  remainderAppliedToLast?: number;
  createdFeeIds?: string[];
  skippedFeeIds?: string[];
};

export async function registerAnnualPrepaidPayment(
  input: RegisterAnnualPrepaidPaymentInput
): Promise<RegisterAnnualPrepaidPaymentResult> {
  const callable = httpsCallable<
    RegisterAnnualPrepaidPaymentInput,
    RegisterAnnualPrepaidPaymentResult
  >(functions, "registerAnnualPrepaidPayment");
  const res = await callable(input);
  return res.data;
}

const DEFAULT_TOAST = "연납 분해 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

export function getRegisterAnnualPrepaidPaymentErrorMessage(error: unknown): string {
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
