import type { TeamFee } from "@/types/fee";
import type { FeePayment, TeamMember } from "@/features/fees/types";
import { buildFeeMemberRows } from "./feeDashboard";

export type FeeCollectionAgg = "unpaid" | "partial" | "paid";

export type FeeRollupStatus = "loading" | "success" | "error";

export type FeeRollupEntry = {
  status: FeeCollectionAgg;
  paidCount: number;
  totalCount: number;
};

export type FeeRollupOptions = {
  /** 팀 정책 `annual.months` 등 — split만 있을 때 완납 오버라이드 최소 개수 */
  expectedAnnualSplitMonths?: number;
};

function isNonCancelled(p: FeePayment): boolean {
  return p.status !== "cancelled";
}

/** 연납 원천·bulk(`annual_prepaid`)만 즉시 완납 신호 — `annual_prepaid_split` 단독은 제외 */
function hasAnnualBulkOrRootSignal(rawPayments: FeePayment[]): boolean {
  return rawPayments.some((p) => {
    if (!isNonCancelled(p)) return false;
    if (p.source === "annual") return true;
    const st = String(p.sourceType ?? "").trim();
    if (st === "annual") return true;
    if (st === "annual_prepaid") return true;
    return false;
  });
}

function countAnnualPrepaidSplits(rawPayments: FeePayment[]): number {
  return rawPayments.filter(
    (p) => isNonCancelled(p) && String(p.sourceType ?? "").trim() === "annual_prepaid_split"
  ).length;
}

/**
 * split 일부만 있는 오판 방지: bulk/원천 연납이 있거나, 활성 split 개수가 기대 월 수 이상일 때만 전역 완납 오버라이드.
 */
function shouldOverridePaidFromAnnualSignals(
  rawPayments: FeePayment[],
  expectedAnnualSplitMonths: number
): boolean {
  if (hasAnnualBulkOrRootSignal(rawPayments)) return true;
  const splitCount = countAnnualPrepaidSplits(rawPayments);
  return splitCount >= Math.max(1, Math.floor(expectedAnnualSplitMonths));
}

type LogicalPay = { status: string };

/**
 * 로스터 기준 집계 + 원문 연납 행 오버라이드(보수적).
 * `logicalPayments`: 멤버별 납부 여부(연납 분해·면제 등은 `buildFeeMemberRows`에서 반영된 값).
 * `rawPayments`: bulk·원천 연납 또는 split 충족 시 완납 오버라이드 판단.
 */
export function getFeeStatus(
  logicalPayments: LogicalPay[],
  rawPayments: FeePayment[],
  expectedAnnualSplitMonths: number
): FeeCollectionAgg {
  if (shouldOverridePaidFromAnnualSignals(rawPayments, expectedAnnualSplitMonths)) return "paid";

  const total = logicalPayments.length;
  const paid = logicalPayments.filter((p) => p.status === "paid").length;
  if (total === 0) return "unpaid";
  if (paid === 0) return "unpaid";
  if (paid === total) return "paid";
  return "partial";
}

/**
 * `teams/…/payments` + 활성 멤버를 `buildFeeMemberRows`에 맡겨 연납 분해·취소·면제를 반영한 뒤,
 * `getFeeStatus`로 상태·건수를 반환한다 (`yearlyPaidAt` 단독 판단 없음).
 */
export function rollupFeeCollectionForFee(
  members: TeamMember[],
  payments: FeePayment[],
  fee: Pick<TeamFee, "id" | "amount" | "dueDate">,
  options?: FeeRollupOptions
): FeeRollupEntry {
  const expectedMonths = Math.max(1, Math.floor(options?.expectedAnnualSplitMonths ?? 12));
  const rows = buildFeeMemberRows(members, payments, fee.amount, fee.dueDate ?? null, fee.id);
  const logicalPayments = rows.map((r) => ({
    status: r.paymentStatus === "paid" ? "paid" : "unpaid",
  }));
  const paidCount = logicalPayments.filter((p) => p.status === "paid").length;
  const totalCount = logicalPayments.length;
  const status = getFeeStatus(logicalPayments, payments, expectedMonths);
  return { status, paidCount, totalCount };
}
