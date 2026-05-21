/**
 * 🔥 대회 페이지 IdentityHeader (STEP 15A)
 * 
 * 대회 공통 정보 표시
 * - 항상 렌더링, Empty 개념 없음
 * - 대회명 / 종목 / 기간
 * - 주최 / 장소
 * - 참가 현황 요약 (팀 수, 마감일)
 */

import { Calendar, MapPin, Users, Trophy } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import { formatDate, safeToDate } from "@/utils/dateUtils";

interface IdentityHeaderProps {
  tournament: Tournament | null;
  associationName?: string;
}

export function TournamentIdentityHeader({
  tournament,
  associationName,
}: IdentityHeaderProps) {
  if (!tournament) {
    return (
      <section className="px-4 pt-6 pb-4 bg-white border-b border-gray-200">
        <div className="text-center py-8">
          <p className="text-gray-500">대회 정보를 불러오는 중...</p>
        </div>
      </section>
    );
  }

  const formatDateRange = () => {
    if (!tournament.dateStart || !tournament.dateEnd) return "일정 미정";
    const start = safeToDate(tournament.dateStart);
    const end = safeToDate(tournament.dateEnd);
    const startStr = `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일`;
    const endStr = `${end.getFullYear()}년 ${end.getMonth() + 1}월 ${end.getDate()}일`;
    if (startStr === endStr) return startStr;
    return `${startStr} ~ ${endStr}`;
  };

  const teamCountText = tournament.teamCount
    ? `${tournament.teamCount}팀`
    : tournament.maxTeams
    ? `최대 ${tournament.maxTeams}팀`
    : "미정";

  const registrationEndDate = tournament.registrationPeriod?.endDate
    ? formatDate(tournament.registrationPeriod.endDate)
    : null;

  return (
    <section className="px-4 pt-6 pb-4 bg-white border-b border-gray-200">
      {/* 대회명 */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {tournament.title || tournament.name || "대회명 없음"}
        </h1>
        {tournament.content && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {tournament.content}
          </p>
        )}
      </div>

      {/* 기본 정보 */}
      <div className="space-y-2 mb-4">
        {formatDateRange() !== "일정 미정" && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>{formatDateRange()}</span>
          </div>
        )}
        {tournament.venue && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{tournament.venue}</span>
          </div>
        )}
        {(tournament.organizer || associationName) && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Trophy className="w-4 h-4 text-gray-500" />
            <span>주최: {tournament.organizer || associationName || "협회"}</span>
          </div>
        )}
      </div>

      {/* 참가 현황 요약 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-3 rounded-lg bg-gray-50 text-center">
          <div className="text-sm font-medium text-gray-900">
            {teamCountText}
          </div>
          <div className="text-xs text-gray-500">참가 팀</div>
        </div>
        {registrationEndDate && (
          <div className="p-3 rounded-lg bg-gray-50 text-center">
            <div className="text-sm font-medium text-gray-900">
              {registrationEndDate}
            </div>
            <div className="text-xs text-gray-500">신청 마감</div>
          </div>
        )}
      </div>
    </section>
  );
}
