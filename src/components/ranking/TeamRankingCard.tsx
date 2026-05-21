/**
 * 🔥 TeamRankingCard - 팀 랭킹 카드 (STEP: 랭킹/통계 시스템)
 * 
 * 마이페이지용: 내 팀의 현재 랭킹 표시
 * - 랭킹 없으면 카드 자체 미노출
 * - EmptyState ❌
 */

import { useMyTeamRanking } from "@/hooks/useMyTeamRanking";
import { Card } from "@/components/ui/cards/Card";
import { Trophy, Medal } from "lucide-react";

export function TeamRankingCard() {
  // 현재 시즌 (간단화: 2025 고정, 나중에 동적 처리 가능)
  const currentSeason = new Date().getFullYear().toString();
  
  const { ranking, loading } = useMyTeamRanking({
    enabled: true,
    season: currentSeason,
  });

  // 로딩 중이거나 랭킹 없으면 카드 자체 미노출
  if (loading || !ranking) {
    return null;
  }

  return (
    <Card variant="summary" className="bg-white border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-base font-semibold text-gray-900">우리 팀 랭킹</h2>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-700">현재 순위</span>
          </div>
          <span className="text-lg font-bold text-gray-900">{ranking.rank}위</span>
        </div>
        {ranking.totalMatches > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>총 경기</span>
            <span>{ranking.totalMatches}경기</span>
          </div>
        )}
        {ranking.wins > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>승리</span>
            <span>{ranking.wins}승</span>
          </div>
        )}
        {ranking.totalPoints > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>총 점수</span>
            <span>{ranking.totalPoints}점</span>
          </div>
        )}
      </div>
    </Card>
  );
}
