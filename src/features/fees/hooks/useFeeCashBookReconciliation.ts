import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

function isPaidLikeStatus(data: Record<string, unknown>): boolean {
  const s = String(data.status ?? "").trim().toLowerCase();
  return (
    s === "paid" ||
    s === "already_paid" ||
    s === "completed" ||
    s === "done" ||
    s === "success" ||
    s === "succeeded"
  );
}

export type FeeCashBookReconciliation = {
  expectedPaidAmountWon: number;
  /** 선택 회차(`feeId`) 기준 cashBook 회비 수입 합 — 미선택 시 전체와 동일 */
  actualCashBookIncomeWon: number;
  /** `feeId` 무관 — 팀 `cashBook` 중 회비 수입(kind/category) 전체 합 (다른 회차에만 반영됐는지 확인용) */
  allFeesMembershipCashBookIncomeWon: number;
  deltaWon: number;
  isMatched: boolean;
};

/**
 * 회비 정합 점검:
 * - expected: teams/{teamId}/payments 중 status=="paid" 금액 합 (feeId 선택 가능)
 * - actual: teams/{teamId}/cashBook 중 membership 수입(kind=income) 합 (feeId 선택 가능)
 * - allFeesMembershipCashBookIncomeWon: feeId 필터 없이 동일 조건 합계(다른 회차 반영 여부 확인)
 */
export function useFeeCashBookReconciliation(teamId: string, feeId?: string) {
  const [expectedPaidAmountWon, setExpectedPaidAmountWon] = useState(0);
  const [actualCashBookIncomeWon, setActualCashBookIncomeWon] = useState(0);
  const [allFeesMembershipCashBookIncomeWon, setAllFeesMembershipCashBookIncomeWon] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setExpectedPaidAmountWon(0);
      setActualCashBookIncomeWon(0);
      setAllFeesMembershipCashBookIncomeWon(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0) setLoading(false);
    };

    const unsubPayments = onSnapshot(
      collection(db, "teams", teamId, "payments"),
      (snap) => {
        let sum = 0;
        snap.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          if (feeId) {
            const rowFeeId = typeof data.feeId === "string" ? data.feeId : "";
            if (rowFeeId !== feeId) return;
          }
          if (!isPaidLikeStatus(data)) return;
          const amt = Math.floor(Number(data.amount || 0));
          if (Number.isFinite(amt) && amt > 0) sum += amt;
        });
        setExpectedPaidAmountWon(sum);
        done();
      },
      (e) => {
        console.error(e);
        setError("정합 점검(payments) 조회 실패");
        done();
      }
    );

    const unsubCashBook = onSnapshot(
      collection(db, "teams", teamId, "cashBook"),
      (snap) => {
        let scoped = 0;
        let allMembership = 0;
        snap.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          if (data.kind !== "income") return;
          if (data.category !== "membership") return;
          if (data.isDeleted === true) return;
          const amt = Math.floor(Number(data.amount || 0));
          if (!Number.isFinite(amt) || amt <= 0) return;
          allMembership += amt;
          if (feeId) {
            const rowFeeId = typeof data.feeId === "string" ? data.feeId : "";
            if (rowFeeId !== feeId) return;
          }
          scoped += amt;
        });
        setActualCashBookIncomeWon(scoped);
        setAllFeesMembershipCashBookIncomeWon(allMembership);
        done();
      },
      (e) => {
        console.error(e);
        setError("정합 점검(cashBook) 조회 실패");
        done();
      }
    );

    return () => {
      unsubPayments();
      unsubCashBook();
    };
  }, [teamId, feeId]);

  const reconciliation = useMemo<FeeCashBookReconciliation>(() => {
    const deltaWon = expectedPaidAmountWon - actualCashBookIncomeWon;
    return {
      expectedPaidAmountWon,
      actualCashBookIncomeWon,
      allFeesMembershipCashBookIncomeWon,
      deltaWon,
      isMatched: deltaWon === 0,
    };
  }, [expectedPaidAmountWon, actualCashBookIncomeWon, allFeesMembershipCashBookIncomeWon]);

  return { reconciliation, loading, error };
}

