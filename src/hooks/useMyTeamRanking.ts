/**
 * 🔥 useMyTeamRanking - 내 팀 랭킹 조회 훅 (STEP: 랭킹/통계 시스템)
 * 
 * 마이페이지용: 내 팀의 현재 랭킹만 조회
 * 규칙:
 * - enabled 가드
 * - 기본값 반환 (null)
 * - throw ❌
 * - 랭킹 없음 = null = 정상
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMyTeams } from "@/hooks/useMyTeams";
import type { TeamRanking } from "@/types/ranking";

interface UseMyTeamRankingOptions {
  enabled?: boolean;
  sport?: string;
  season?: string;
}

export function useMyTeamRanking(options?: UseMyTeamRankingOptions) {
  const enabled = options?.enabled !== false;
  const sport = options?.sport;
  const season = options?.season;
  const { teamMembers } = useMyTeams();
  const myTeam = teamMembers[0];

  const [ranking, setRanking] = useState<TeamRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !myTeam) {
      setRanking(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchRanking = async () => {
      try {
        setLoading(true);
        setError(null);

        const rankingsRef = collection(db, "teamRankings");
        let q = query(rankingsRef, where("teamId", "==", myTeam.teamId));

        // 필터링
        if (sport) {
          q = query(q, where("sport", "==", sport));
        }
        if (season) {
          q = query(q, where("season", "==", season));
        }

        // 최신 1개만
        q = query(q, limit(1));

        const snap = await getDocs(q);

        if (!snap.empty) {
          const doc = snap.docs[0];
          setRanking({
            id: doc.id,
            ...doc.data(),
          } as TeamRanking);
        } else {
          setRanking(null); // 랭킹 없음 = 정상
        }
      } catch (err) {
        console.warn("[useMyTeamRanking] 랭킹 조회 실패 (정상 상태로 처리):", err);
        setRanking(null); // 에러 시 null = 정상 상태
        setError(err instanceof Error ? err : new Error("랭킹 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [enabled, sport, season, myTeam?.teamId]);

  return {
    ranking,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
