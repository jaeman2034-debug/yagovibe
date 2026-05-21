import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type InitializeTeamAccountingParams = {
  teamId: string;
  /** 생략 시 서버 기본 20,000원 */
  monthlyFee?: number;
};

export type InitializeTeamAccountingResult = {
  success: boolean;
  feeId?: string;
  autoMonthKey?: string;
  monthlyAmount?: number;
  skipped?: "fee_already_exists";
};

/**
 * 신규 팀 회계 온보딩 — `feePolicies/default` + 이번 달(서울) 첫 회차 + payments 시드(서버 트리거).
 */
export async function initializeTeamAccountingCallable(
  params: InitializeTeamAccountingParams
): Promise<InitializeTeamAccountingResult> {
  const fn = httpsCallable<InitializeTeamAccountingParams, InitializeTeamAccountingResult>(
    functions,
    "initializeTeamAccounting"
  );
  const res = await fn(params);
  const data = res.data as Record<string, unknown>;
  return {
    success: data.success === true,
    feeId: typeof data.feeId === "string" ? data.feeId : undefined,
    autoMonthKey: typeof data.autoMonthKey === "string" ? data.autoMonthKey : undefined,
    monthlyAmount: typeof data.monthlyAmount === "number" ? data.monthlyAmount : undefined,
    skipped: data.skipped === "fee_already_exists" ? "fee_already_exists" : undefined,
  };
}
