/**
 * Tournament 카드 컴포넌트 (Public)
 * 
 * 카드 구성:
 * - 대회명
 * - 기간 · 장소
 * - 상태 배지
 * - 대진표 상태
 */

import { useNavigate } from "react-router-dom";
import type { Tournament } from "@/types/tournament";
import { TournamentStatusBadge } from "./TournamentStatusBadge";

interface TournamentCardProps {
  tournament: Tournament;
  associationId: string;
}

export function TournamentCard({ tournament, associationId }: TournamentCardProps) {
  const navigate = useNavigate();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
  };

  const formatDateRange = () => {
    const start = tournament.dateStart.toDate();
    const end = tournament.dateEnd.toDate();
    
    if (start.getTime() === end.getTime()) {
      return formatDate(start);
    }
    
    return `${formatDate(start)} ~ ${formatDate(end)}`;
  };

  return (
    <div
      onClick={() => navigate(`/association/${associationId}/tournaments/${tournament.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">
                {tournament.title}
              </h3>
              {(tournament.isOfficial !== false) && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded flex-shrink-0">
                  공식
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span>{formatDateRange()}</span>
              <span>·</span>
              <span>{tournament.venue}</span>
            </div>
          </div>
        </div>

        {/* 상태 및 대진표 */}
        <div className="flex items-center gap-2 text-sm">
          <TournamentStatusBadge tournament={tournament} />
          {tournament.bracketStatus === "confirmed" ? (
            <span className="text-green-600">✔ 대진표 확정</span>
          ) : (
            <span className="text-gray-400">대진표 준비중</span>
          )}
        </div>
      </div>
    </div>
  );
}

