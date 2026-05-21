/**
 * 🔥 useTeamUsage - 팀 사용량 조회 훅
 * 
 * Admin만 조회 가능 (Firestore Rules)
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamUsage } from "@/types/usage";

export function useTeamUsage(teamId: string | null | undefined) {
  const [usage, setUsage] = useState<TeamUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      setUsage(null);
      return;
    }

    const fetchUsage = async () => {
      try {
        setLoading(true);
        setError(null);

        const usageDoc = await getDoc(doc(db, `teams/${teamId}/usage/current`));
        
        if (usageDoc.exists()) {
          setUsage(usageDoc.data() as TeamUsage);
        } else {
          // Usage 문서가 없으면 기본값
          setUsage({
            membersCount: 0,
            actionsThisMonth: 0,
            storageMB: 0,
            updatedAt: null,
          });
        }
      } catch (err) {
        console.error("❌ [useTeamUsage] Usage 조회 실패:", err);
        setError(err instanceof Error ? err : new Error("Usage 조회에 실패했습니다."));
        setUsage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [teamId]);

  return { usage, loading, error };
}
