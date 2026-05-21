/**
 * 🔥 TeamCard - 팀 카드 컴포넌트 (STEP: 팀원 가입 플로우)
 * 
 * 팀 탐색 페이지에서 사용하는 팀 카드
 * - 팀명, 종목, 지역, 간단 소개
 * - 가입 요청 버튼 (JoinTeamButton 사용)
 */

import { MapPin, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/cards/Card";
import { JoinTeamButton } from "./JoinTeamButton";
import type { PublicTeam } from "@/hooks/usePublicTeams";

interface TeamCardProps {
  team: PublicTeam;
}

export function TeamCard({ team }: TeamCardProps) {
  const navigate = useNavigate();

  // 🔥 협회 배지 정보
  const associationRelation = team.associationRelation || 
    (team.associationId ? { associationId: team.associationId, status: "official" as const } : undefined);
  
  const showBadge = associationRelation && 
    (associationRelation.status === "official" || associationRelation.status === "related");
  
  const badgeText = associationRelation?.status === "official" 
    ? "노원구 축구협회 산하"
    : associationRelation?.status === "related"
    ? "노원구 축구협회 연계"
    : null;

  const badgeColor = associationRelation?.status === "official"
    ? "bg-green-100 text-green-700"
    : "bg-yellow-100 text-yellow-700";

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (associationRelation?.associationId) {
      navigate(`/association/${associationRelation.associationId}`);
    }
  };

  return (
    <Card variant="info" className="hover:shadow-md transition-shadow">
      {/* 팀명 + 배지 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {team.name}
            </h3>
            {showBadge && badgeText && (
              <button
                onClick={handleBadgeClick}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor} hover:opacity-80 transition-opacity`}
                title="협회 페이지로 이동"
              >
                {badgeText}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {team.region && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{team.region}</span>
              </div>
            )}
            {team.sportType && (
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                <span>{team.sportType === "football" ? "축구" : team.sportType}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 간단 소개 */}
      {team.description && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
          {team.description}
        </p>
      )}

      {/* 가입 요청 버튼 */}
      <div className="mt-4">
        <JoinTeamButton teamId={team.id} />
      </div>
    </Card>
  );
}
