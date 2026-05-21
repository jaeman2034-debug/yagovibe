/**
 * 🔥 useTeamPlan - 팀 플랜 조회 훅
 * 
 * 최적화:
 * - teamId로 teams 컬렉션에서 플랜 정보만 조회
 * - 캐싱 최적화 (teamId 변경 시에만 재조회)
 * - 기본값: "free"
 * 
 * 사용:
 * - 플랜 제한 체크
 * - Paywall 표시 여부
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlanType } from "@/types/plan";

export interface TeamPlanInfo {
  plan: PlanType;
  teamId: string;
  loading: boolean;
  error: Error | null;
}

export function useTeamPlan(teamId: string | null | undefined): TeamPlanInfo {
  const [plan, setPlan] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!teamId) {
      setPlan("free");
      setLoading(false);
      setError(null);
      return;
    }

    const fetchPlan = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔥 teams 컬렉션에서 플랜 정보만 조회
        const teamDoc = await getDoc(doc(db, "teams", teamId));
        
        if (teamDoc.exists()) {
          const teamData = teamDoc.data();
          const teamPlan = (teamData.plan as PlanType) || "free";
          setPlan(teamPlan);
        } else {
          setPlan("free");
        }
      } catch (err) {
        console.error("❌ [useTeamPlan] 플랜 조회 실패:", err);
        setError(err instanceof Error ? err : new Error("플랜 조회에 실패했습니다."));
        setPlan("free"); // 에러 시 기본값
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [teamId]);

  return {
    plan,
    teamId: teamId || "",
    loading,
    error,
  };
}
