/**
 * 🔥 대회 운영 요금제 Hook
 * 
 * Association의 plan 정보를 조회
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TournamentPlanType } from "@/types/tournamentPlan";

interface UseTournamentPlanResult {
  plan: TournamentPlanType;
  loading: boolean;
  error: Error | null;
}

/**
 * Association의 요금제 정보 조회
 */
export function useTournamentPlan(associationId: string | null | undefined): UseTournamentPlanResult {
  const [plan, setPlan] = useState<TournamentPlanType>("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!associationId) {
      setPlan("free");
      setLoading(false);
      return;
    }

    const fetchPlan = async () => {
      try {
        setLoading(true);
        const associationRef = doc(db, `associations/${associationId}`);
        const associationSnap = await getDoc(associationRef);

        if (associationSnap.exists()) {
          const data = associationSnap.data();
          const planValue = data?.plan || "free";
          // 타입 안전성 체크
          if (planValue === "free" || planValue === "basic" || planValue === "pro") {
            setPlan(planValue);
          } else {
            setPlan("free");
          }
        } else {
          setPlan("free");
        }
        setError(null);
      } catch (err) {
        console.error("[useTournamentPlan] 오류:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setPlan("free");
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [associationId]);

  return { plan, loading, error };
}
