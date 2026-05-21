/**
 * 🔥 대회 관리 페이지 (관리자용) (STEP: 대회 운영 플로우)
 * 
 * /tournament/{id}/manage 또는 /admin/tournaments/{id}
 * 
 * 관리자용 대회 참가 신청 관리 페이지
 * - IdentityHeader: 대회명 / 기간 / 현재 신청 팀 수
 * - PersonaSection: 신청 팀 목록
 * - OpportunitySection: 없음 (관리자는 여기서 행동 안 함)
 * 
 * 핵심 원칙:
 * - 관리자도 동일한 3-Layer 구조 사용
 * - 같은 구조, 다른 Persona일 뿐
 */

import { useParams, useNavigate } from "react-router-dom";
import { useTournament } from "@/hooks/useTournament";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useTournamentApplications } from "@/hooks/useTournamentApplications";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import { IdentityHeader } from "@/components/ui/layout/IdentityHeader";
import { ApplicationList } from "@/components/tournament/admin/ApplicationList";
import { Users, Trophy, Calendar } from "lucide-react";
import { formatDate, safeToDate } from "@/utils/dateUtils";

export default function TournamentAdminPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  // 대회 정보 조회
  const { tournament, loading: tournamentLoading } = useTournament(
    associationId,
    tournamentId,
    { isAdmin: true } // 관리자이므로 published 체크 없이 조회
  );

  // 신청 목록 조회
  const { applications } = useTournamentApplications(
    associationId,
    tournamentId,
    { enabled: true }
  );

  // 권한 체크
  if (adminLoading || tournamentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            관리자 권한이 필요합니다
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">대회를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800"
          >
            돌아가기
          </button>
        </div>
      </div>
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

  const pendingCount = applications.filter(
    (app) => app.status?.toUpperCase() === "PENDING"
  ).length;
  const approvedCount = applications.filter(
    (app) => app.status?.toUpperCase() === "APPROVED"
  ).length;

  return (
    <HubLayout
      header={
        <IdentityHeader
          title={tournament.title || tournament.name || "대회명 없음"}
          subtitle="대회 참가 신청 관리"
          meta={
            <div className="space-y-2">
              {formatDateRange() !== "일정 미정" && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateRange()}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">
                    대기: <span className="font-medium">{pendingCount}</span>건
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">
                    승인: <span className="font-medium">{approvedCount}</span>건
                  </span>
                </div>
              </div>
            </div>
          }
        />
      }
      persona={
        <div className="px-4 py-6">
          <ApplicationList
            associationId={associationId!}
            tournamentId={tournamentId!}
          />
        </div>
      }
      // OpportunitySection 없음 (관리자는 여기서 행동 안 함)
    />
  );
}
