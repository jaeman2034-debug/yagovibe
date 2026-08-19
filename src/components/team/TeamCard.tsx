/**
 * TeamCard — 팀 탐색 목록 카드
 * - 카드 클릭 → 팀 홈 (/team/:id/public) — 추천팀 카드와 UX 통일
 * - 가입 요청 버튼 → 기존 가입 신청 (stopPropagation)
 */

import { useCallback, type KeyboardEvent, type MouseEvent } from "react";
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
  const teamHomePath = `/team/${encodeURIComponent(team.id)}/public`;

  const associationRelation =
    team.associationRelation ||
    (team.associationId
      ? { associationId: team.associationId, status: "official" as const }
      : undefined);

  const showBadge =
    associationRelation &&
    (associationRelation.status === "official" || associationRelation.status === "related");

  const badgeText =
    associationRelation?.status === "official"
      ? "노원구 축구협회 산하"
      : associationRelation?.status === "related"
        ? "노원구 축구협회 연계"
        : null;

  const badgeColor =
    associationRelation?.status === "official"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";

  const goTeamHome = useCallback(() => {
    navigate(teamHomePath);
  }, [navigate, teamHomePath]);

  const handleBadgeClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (associationRelation?.associationId) {
      navigate(`/association/${associationRelation.associationId}`);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goTeamHome();
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`${team.name}, 팀 홈으로 이동`}
      className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1"
      onClick={goTeamHome}
      onKeyDown={onKeyDown}
    >
      <Card variant="info" className="transition-shadow hover:shadow-md">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
              {showBadge && badgeText ? (
                <button
                  type="button"
                  onClick={handleBadgeClick}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${badgeColor}`}
                  title="협회 페이지로 이동"
                >
                  {badgeText}
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              {team.region ? (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{team.region}</span>
                </div>
              ) : null}
              {team.sportType ? (
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span>{team.sportType === "football" ? "축구" : team.sportType}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {team.description ? (
          <p className="mb-4 line-clamp-2 text-sm text-gray-700">{team.description}</p>
        ) : null}

        <div
          className="mt-4"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <JoinTeamButton teamId={team.id} />
        </div>
      </Card>
    </div>
  );
}
