/**
 * 🔥 useTournamentResults - 대회 결과 조회 훅
 * 
 * 규칙:
 * - enabled 가드
 * - 기본값 반환 ([])
 * - throw ❌
 * - 결과 0개 → [] → 정상
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TournamentResult } from "@/types/tournament";

interface UseTournamentResultsOptions {
  enabled?: boolean;
  tournamentId?: string;
  teamId?: string;
}

export function useTournamentResults(options?: UseTournamentResultsOptions) {
  const enabled = options?.enabled !== false;
  const tournamentId = options?.tournamentId;
  const teamId = options?.teamId;

  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        const resultsRef = collection(db, "tournamentResults");
        let q = query(resultsRef);

        // 필터링
        if (tournamentId) {
          q = query(q, where("tournamentId", "==", tournamentId));
        }
        if (teamId) {
          q = query(q, where("teamId", "==", teamId));
        }

        // 정렬 (rank 우선, 없으면 recordedAt)
        q = query(q, orderBy("rank", "asc"), orderBy("recordedAt", "desc"));

        const snap = await getDocs(q);

        const resultsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TournamentResult[];

        setResults(resultsData);
      } catch (err) {
        console.warn("[useTournamentResults] 결과 조회 실패 (정상 상태로 처리):", err);
        setResults([]); // 에러 시 빈 배열 = 정상 상태
        setError(err instanceof Error ? err : new Error("결과 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [enabled, tournamentId, teamId]);

  return {
    results,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
