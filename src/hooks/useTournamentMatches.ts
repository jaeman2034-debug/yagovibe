/**
 * 🔥 토너먼트 경기 실시간 구독 Hook
 * matches 컬렉션을 실시간으로 구독하여 UI 즉시 반영
 * 
 * 기능:
 * - 실시간 구독 (onSnapshot)
 * - 정렬 고정 (roundNumber, matchIndex)
 * - Hook 안전 (최상단 호출)
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useTournamentMatches(
  associationId: string | undefined,
  tournamentId: string | undefined
) {
  // 🔥 모든 Hook은 컴포넌트 최상단에서 호출 (조건부 사용 절대 금지)
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!associationId || !tournamentId) {
      setMatches([]);
      setLoading(false);
      return;
    }

    try {
      const matchesRef = collection(
        db,
        "associations",
        associationId,
        "tournaments",
        tournamentId,
        "matches"
      );

      // 🔥 정렬: roundNumber 먼저, 그 다음 matchIndex
      const q = query(
        matchesRef,
        orderBy("roundNumber", "asc"),
        orderBy("matchIndex", "asc")
      );

      // 🔥 실시간 구독
      const unsub = onSnapshot(
        q,
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setMatches(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("실시간 구독 오류:", err);
          setError(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
          setLoading(false);
        }
      );

      // 🔥 cleanup 함수
      return () => unsub();
    } catch (err: any) {
      console.error("쿼리 설정 오류:", err);
      setError(err.message || "쿼리 설정에 실패했습니다.");
      setLoading(false);
    }
  }, [associationId, tournamentId]);

  return { matches, loading, error };
}

