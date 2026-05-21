/**
 * 🔥 useTeamRankings - 팀 랭킹 조회 훅 (STEP: 랭킹/통계 시스템)
 * 
 * 규칙:
 * - enabled 가드
 * - 기본값 반환 ([])
 * - throw ❌
 * - 랭킹 없음 = [] = 정상
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamRanking } from "@/types/ranking";

interface UseTeamRankingsOptions {
  enabled?: boolean;
  sport?: string;
  season?: string; // 호환성 유지
  seasonId?: string | null; // STEP: 시즌/연도 관리 시스템
}

export function useTeamRankings(options?: UseTeamRankingsOptions) {
  const enabled = options?.enabled !== false;
  const sport = options?.sport;
  const season = options?.seasonId ?? options?.season; // seasonId 우선, 없으면 season (호환성)

  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRankings([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchRankings = async () => {
      try {
        setLoading(true);
        setError(null);

        const rankingsRef = collection(db, "teamRankings");
        let q = query(rankingsRef);

        // 필터링
        if (sport) {
          q = query(q, where("sport", "==", sport));
        }
        if (season) {
          q = query(q, where("season", "==", season));
        }

        // 정렬 (rank 순)
        q = query(q, orderBy("rank", "asc"));

        const snap = await getDocs(q);

        const rankingsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TeamRanking[];

        setRankings(rankingsData);
      } catch (err) {
        console.warn("[useTeamRankings] 랭킹 조회 실패 (정상 상태로 처리):", err);
        setRankings([]); // 에러 시 빈 배열 = 정상 상태
        setError(err instanceof Error ? err : new Error("랭킹 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [enabled, sport, season]);

  return {
    rankings,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
