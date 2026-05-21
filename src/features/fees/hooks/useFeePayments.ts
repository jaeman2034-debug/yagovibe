import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import { mapPaymentQuerySnapshotDocsToFeePayments } from "../utils/feePaymentQueryMap";

export function useFeePayments(teamId: string, feeId?: string, refreshToken: number = 0) {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || !feeId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "teams", teamId, "payments"), where("feeId", "==", feeId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setPayments(mapPaymentQuerySnapshotDocsToFeePayments(snap.docs, String(feeId || "").trim()));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        if (err instanceof FirebaseError && err.code) {
          if (err.code === "permission-denied") {
            setError("결제 상태 조회 권한이 없습니다. 팀 권한/Rules 배포 상태를 확인해 주세요.");
          } else {
            setError(`결제 상태를 불러오지 못했습니다. (${err.code})`);
          }
        } else {
          setError("결제 상태를 불러오지 못했습니다.");
        }
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, feeId, refreshToken]);

  return { payments, loading, error };
}
