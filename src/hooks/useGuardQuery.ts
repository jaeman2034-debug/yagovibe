/**
 * 🔥 useGuardQuery - Guard 쿼리 훅
 * 
 * React Query 스타일의 데이터 페칭 + 캐싱
 * teamId 변경 시에만 재조회
 */

import { useEffect, useState } from "react";
import { guardTeamAccess, type GuardResult } from "@/utils/guardTeamAccess";

export function useGuardQuery(
  uid: string | null | undefined,
  teamId: string | null | undefined,
  requiredPlan?: "pro" | "academy_pro"
) {
  const [data, setData] = useState<GuardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid || !teamId) {
      if (!uid) {
        setData({ type: "needLogin" });
      } else if (!teamId) {
        setData({ type: "needTeam" });
      }
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchGuard = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await guardTeamAccess({
          uid,
          teamId,
          requiredPlan,
        });

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("❌ [useGuardQuery] Guard 체크 실패:", err);
          setError(err instanceof Error ? err : new Error("Guard 체크 실패"));
          setData({ type: "needTeam" }); // 에러 시 기본값
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchGuard();

    return () => {
      cancelled = true;
    };
  }, [uid, teamId, requiredPlan]);

  return { data, loading, error };
}
