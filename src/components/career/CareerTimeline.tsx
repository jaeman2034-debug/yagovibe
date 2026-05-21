/**
 * 🔥 CareerTimeline - 커리어 타임라인 (STEP: 개인 기록 상세 페이지)
 * 
 * 타임라인 단위:
 * - 대회 1회 = 카드 1개
 * 
 * 규칙:
 * - 팀이 해체돼도 표시
 * - 대회 삭제돼도 기록 유지
 * - EmptyState 없음 (결과 없으면 빈 리스트)
 */

import { useMyCareer } from "@/hooks/useMyCareer";
import { Trophy, Medal, Calendar, Users } from "lucide-react";
import { safeToDate } from "@/utils/dateUtils";

interface CareerTimelineProps {
  seasonId?: string | null; // STEP: 시즌/연도 관리 시스템
}

export function CareerTimeline({ seasonId }: CareerTimelineProps) {
  const { careerItems, loading } = useMyCareer({ seasonId });

  if (loading) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (careerItems.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">기록이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {careerItems.map((item) => {
        const date = item.recordedAt ? safeToDate(item.recordedAt) : null;
        const dateStr = date
          ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`
          : "날짜 없음";

        return (
          <div
            key={item.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              {/* 왼쪽: 날짜 + 대회 정보 */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{dateStr}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {item.tournamentName || "대회"}
                </h3>
                {item.teamName && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>소속팀: {item.teamName}</span>
                  </div>
                )}
              </div>

              {/* 오른쪽: 성적 */}
              <div className="text-right ml-4">
                {item.rank !== undefined && (
                  <div className="flex items-center gap-2 mb-1">
                    <Medal className="w-5 h-5 text-yellow-500" />
                    <span className="text-xl font-bold text-gray-900">{item.rank}위</span>
                  </div>
                )}
                {item.score !== undefined && (
                  <div className="text-sm text-gray-600">{item.score}점</div>
                )}
                {item.resultText && (
                  <div className="text-sm text-gray-600">{item.resultText}</div>
                )}
                {!item.rank && !item.score && !item.resultText && (
                  <div className="text-sm text-gray-400">기록 없음</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
