/**
 * 스토리 카드 컴포넌트
 * 
 * 원칙:
 * - 검증된 활동 기록 카드
 * - 개인 서술 ❌
 * - 감정/의견 ❌
 * - 공식 기록 ⭕
 */

import { useNavigate } from "react-router-dom";
import type { Story } from "@/types/story";

interface StoryCardProps {
  story: Story;
  showPersonName?: boolean;
}

export function StoryCard({ story, showPersonName = false }: StoryCardProps) {
  const navigate = useNavigate();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "tournament_participation":
        return "대회 참가";
      case "official_role":
        return "공식 역할";
      case "public_contribution":
        return "공공 기여";
      case "club_operation":
        return "클럽 운영";
      case "roster_submission":
        return "선수 명단";
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleTournamentClick = () => {
    if (story.tournamentId && story.associationId) {
      navigate(`/association/${story.associationId}/tournaments/${story.tournamentId}`);
    }
  };

  const handleAssociationClick = () => {
    if (story.associationId) {
      navigate(`/association/${story.associationId}`);
    }
  };

  return (
    <article className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {showPersonName && (
            <div className="text-sm font-medium text-gray-900 mb-1">
              {story.personName}
            </div>
          )}
          <h3 className="text-base font-semibold text-gray-900 mb-2">{story.title}</h3>
        </div>
        {story.verified && (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0 ml-2">
            <span>✔</span>
            <span>AI 검증 완료</span>
          </span>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="mb-3 space-y-1">
        <div>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            {getTypeLabel(story.type)}
          </span>
        </div>
        {story.metadata?.tournamentName && (
          <div className="text-sm text-gray-600">
            대회: {story.metadata.tournamentName}
          </div>
        )}
        {story.metadata?.role && (
          <div className="text-sm text-gray-600">
            역할: {story.metadata.role}
          </div>
        )}
      </div>

      {/* 시스템 문장 (description) */}
      <p className="text-sm text-gray-700 mb-3">{story.description}</p>

      {/* 링크 (읽기 전용) */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
        {story.tournamentId && story.associationId && (
          <button
            onClick={handleTournamentClick}
            className="text-blue-600 hover:text-blue-800"
          >
            대회 보기 →
          </button>
        )}
        {story.associationId && (
          <button
            onClick={handleAssociationClick}
            className="text-blue-600 hover:text-blue-800"
          >
            협회 보기 →
          </button>
        )}
      </div>

      {/* 날짜 */}
      <div className="text-xs text-gray-500">
        {formatDate(story.createdAt.toDate())}
      </div>
    </article>
  );
}
