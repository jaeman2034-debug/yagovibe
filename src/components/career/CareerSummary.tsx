/**
 * 🔥 CareerSummary - 커리어 요약 카드 (STEP: 개인 기록 상세 페이지)
 * 
 * 요약 정보:
 * - 총 참가 대회 수
 * - 최고 성적
 * - 최근 대회
 * 
 * 규칙:
 * - 결과 없으면 카드 미노출
 * - EmptyState ❌
 */

import { useMyCareer } from "@/hooks/useMyCareer";
import { Card } from "@/components/ui/cards/Card";
import { Trophy, Medal, Calendar } from "lucide-react";

interface CareerSummaryProps {
  seasonId?: string | null; // STEP: 시즌/연도 관리 시스템
}

export function CareerSummary({ seasonId }: CareerSummaryProps) {
  const { careerItems, loading } = useMyCareer({ seasonId });

  // 로딩 중이거나 결과 없으면 카드 자체 미노출
  if (loading || careerItems.length === 0) {
    return null;
  }

  // 통계 계산
  const totalTournaments = careerItems.length;
  
  // 최고 성적 (rank가 가장 낮은 것 = 1위)
  const bestRank = careerItems
    .filter((item) => item.rank !== undefined)
    .reduce((min, item) => {
      if (min === null) return item.rank!;
      return item.rank! < min ? item.rank! : min;
    }, null as number | null);

  // 최근 대회
  const latestTournament = careerItems[0];

  return (
    <Card variant="summary" className="bg-white border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-base font-semibold text-gray-900">커리어 요약</h2>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">총 참가 대회</span>
          <span className="text-lg font-bold text-gray-900">{totalTournaments}회</span>
        </div>
        {bestRank !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Medal className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-700">최고 성적</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{bestRank}위</span>
          </div>
        )}
        {latestTournament && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-700">최근 대회</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {latestTournament.tournamentName || "대회"}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
