import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import type { FeePayment } from "../types";
import { mapPaymentQuerySnapshotDocsToFeePayments } from "../utils/feePaymentQueryMap";

/** 동일 팀 내 여러 `feeId`의 payments를 실시간 구독(회차당 리스너 1개). */
export function usePaymentsSnapshotsByFeeIds(teamId: string | undefined, feeIds: readonly string[]) {
  const sortedKey = useMemo(() => [...feeIds].sort().join("\0"), [feeIds]);

  const [paymentsByFeeId, setPaymentsByFeeId] = useState<Record<string, FeePayment[]>>({});
  const [initialSnapByFeeId, setInitialSnapByFeeId] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || feeIds.length === 0) {
      setPaymentsByFeeId({});
      setInitialSnapByFeeId({});
      setError(null);
      return;
    }

    const ids = [...feeIds].sort((a, b) => a.localeCompare(b));
    setPaymentsByFeeId({});
    setInitialSnapByFeeId({});
    setError(null);

    const unsubs = ids.map((feeId) => {
      const q = query(collection(db, "teams", teamId, "payments"), where("feeId", "==", feeId));
      return onSnapshot(
        q,
        (snap) => {
          const list = mapPaymentQuerySnapshotDocsToFeePayments(snap.docs, feeId);
          setPaymentsByFeeId((prev) => ({ ...prev, [feeId]: list }));
          setInitialSnapByFeeId((prev) => ({ ...prev, [feeId]: true }));
        },
        (err) => {
          console.error(err);
          if (err instanceof FirebaseError && err.code === "permission-denied") {
            setError("결제 상태 조회 권한이 없습니다.");
          } else {
            setError("결제 상태를 불러오지 못했습니다.");
          }
        }
      );
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [teamId, sortedKey]);

  const loading =
    Boolean(teamId && feeIds.length > 0) && feeIds.some((id) => !initialSnapByFeeId[id]);

  return { paymentsByFeeId, loading, error };
}
