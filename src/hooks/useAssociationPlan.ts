/**
 * 🔐 협회 플랜 조회 Hook (v2)
 * 
 * 요금제별 기능 가드에 사용
 */

import { useState, useEffect } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlanType } from "@/utils/planGuard";

interface UseAssociationPlanOptions {
  realtime?: boolean; // 실시간 구독 여부 (기본값: true)
}

interface AssociationPlan {
  plan: PlanType;
  billingStatus: "active" | "inactive" | "trial" | "expired";
  planStartedAt?: any; // Timestamp
  planExpiresAt?: any; // Timestamp
}

/**
 * 협회 플랜 조회 Hook
 * 
 * @param associationId 협회 ID
 * @param options 옵션
 */
export function useAssociationPlan(
  associationId: string | undefined,
  options: UseAssociationPlanOptions = { realtime: true }
): {
  plan: PlanType;
  billingStatus: AssociationPlan["billingStatus"];
  loading: boolean;
  error: Error | null;
} {
  const [plan, setPlan] = useState<PlanType>("free");
  const [billingStatus, setBillingStatus] = useState<AssociationPlan["billingStatus"]>("inactive");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!associationId) {
      setPlan("free");
      setBillingStatus("inactive");
      setLoading(false);
      return;
    }

    const associationRef = doc(db, `associations/${associationId}`);

    if (options.realtime) {
      // 실시간 구독
      const unsubscribe = onSnapshot(
        associationRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setPlan((data.plan as PlanType) || "free");
            setBillingStatus((data.billingStatus as AssociationPlan["billingStatus"]) || "inactive");
          } else {
            setPlan("free");
            setBillingStatus("inactive");
          }
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("[useAssociationPlan] 구독 오류:", err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // 일회성 조회
      getDoc(associationRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setPlan((data.plan as PlanType) || "free");
            setBillingStatus((data.billingStatus as AssociationPlan["billingStatus"]) || "inactive");
          } else {
            setPlan("free");
            setBillingStatus("inactive");
          }
          setLoading(false);
          setError(null);
        })
        .catch((err) => {
          console.error("[useAssociationPlan] 조회 오류:", err);
          setError(err);
          setLoading(false);
        });
    }
  }, [associationId, options.realtime]);

  return { plan, billingStatus, loading, error };
}
