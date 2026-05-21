/**
 * 🔥 RankingList - 랭킹 리스트 (STEP: 랭킹/통계 시스템)
 * 
 * 팀 랭킹 목록 표시
 * - EmptyState 없음
 * - 랭킹 없으면 빈 리스트
 */

import { useTeamRankings } from "@/hooks/useTeamRankings";
import { Medal, Trophy } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";

interface RankingListProps {
  sport?: string;
  season?: string;
}

interface RankingWithTeamName {
  id: string;
  teamId: string;
  teamName?: string;
  sport: string;
  season: string;
  totalPoints: number;
  totalMatches: number;
  wins: number;
  rank: number;
}

export function RankingList({ sport, season }: RankingListProps) {
  const { rankings, loading } = useTeamRankings({
    enabled: true,
    sport,
    season,
  });
  const [rankingsWithNames, setRankingsWithNames] = useState<RankingWithTeamName[]>([]);

  // 팀 이름 조회
  useEffect(() => {
    if (!rankings.length) {
      setRankingsWithNames([]);
      return;
    }

    const loadTeamNames = async () => {
      try {
        const rankingsWithNamesData = await Promise.all(
          rankings.map(async (ranking) => {
            try {
              const teamRef = doc(db, "teams", ranking.teamId);
              const teamSnap = await getDoc(teamRef);
              const teamName = teamSnap.exists() ? teamSnap.data().name : undefined;
              return {
                ...ranking,
                teamName,
              };
            } catch (error) {
              console.warn("[RankingList] 팀 이름 조회 실패:", error);
              return {
                ...ranking,
                teamName: undefined,
              };
            }
          })
        );
        setRankingsWithNames(rankingsWithNamesData);
      } catch (error) {
        console.error("[RankingList] 랭킹 처리 실패:", error);
        setRankingsWithNames([]);
      }
    };

    loadTeamNames();
  }, [rankings]);

  if (loading) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (rankingsWithNames.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">랭킹 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-2">
      {rankingsWithNames.map((ranking) => (
        <div
          key={ranking.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 순위 배지 */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold">
                {ranking.rank <= 3 ? (
                  <Medal className="w-5 h-5" />
                ) : (
                  <span>{ranking.rank}</span>
                )}
              </div>

              {/* 팀 정보 */}
              <div>
                <div className="font-semibold text-gray-900">
                  {ranking.teamName || `팀 ${ranking.teamId.slice(0, 8)}...`}
                </div>
                <div className="text-xs text-gray-500">
                  {ranking.sport} • {ranking.season} 시즌
                </div>
              </div>
            </div>

            {/* 통계 */}
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {ranking.totalPoints}점
              </div>
              <div className="text-xs text-gray-500">
                {ranking.wins}승 / {ranking.totalMatches}경기
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
