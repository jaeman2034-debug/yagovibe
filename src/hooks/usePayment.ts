/**
 * 💳 결제 정보 조회 Hook (v2)
 * 
 * 승인된 신청의 결제 정보를 실시간으로 조회
 */

import { useState, useEffect } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment } from "@/types/payment";

interface UsePaymentOptions {
  realtime?: boolean; // 실시간 구독 여부 (기본값: true)
}

/**
 * 결제 정보 조회 Hook
 * 
 * @param associationId 협회 ID
 * @param tournamentId 대회 ID
 * @param applicationId 신청 ID (payment ID와 동일)
 * @param options 옵션
 */
export function usePayment(
  associationId: string | undefined,
  tournamentId: string | undefined,
  applicationId: string | undefined,
  options: UsePaymentOptions = { realtime: true }
): {
  payment: Payment | null;
  loading: boolean;
  error: Error | null;
} {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!associationId || !tournamentId || !applicationId) {
      setPayment(null);
      setLoading(false);
      return;
    }

    const paymentRef = doc(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/payments/${applicationId}`
    );

    if (options.realtime) {
      // 실시간 구독
      const unsubscribe = onSnapshot(
        paymentRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setPayment({
              id: snapshot.id,
              ...data,
            } as Payment);
          } else {
            setPayment(null);
          }
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("[usePayment] 구독 오류:", err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // 일회성 조회
      getDoc(paymentRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setPayment({
              id: snapshot.id,
              ...data,
            } as Payment);
          } else {
            setPayment(null);
          }
          setLoading(false);
          setError(null);
        })
        .catch((err) => {
          console.error("[usePayment] 조회 오류:", err);
          setError(err);
          setLoading(false);
        });
    }
  }, [associationId, tournamentId, applicationId, options.realtime]);

  return { payment, loading, error };
}
