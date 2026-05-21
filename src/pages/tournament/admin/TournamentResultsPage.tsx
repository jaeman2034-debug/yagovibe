/**
 * 🔥 대회 결과 입력 페이지 (관리자용) (STEP: 대회 결과/기록 시스템)
 * 
 * /tournament/{id}/results 또는 /admin/tournaments/{id}/results
 * 
 * 관리자용 대회 결과 입력 페이지
 * - IdentityHeader: 대회명 / 종목
 * - PersonaSection: 참가 팀 리스트 + 각 팀별 결과 입력
 * - OpportunitySection: 없음
 * 
 * 핵심 원칙:
 * - 한 팀 = 한 결과 문서
 * - 수정은 updateDoc으로
 * - 삭제 ❌ (히스토리 보호)
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTournament } from "@/hooks/useTournament";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useTournamentApplications } from "@/hooks/useTournamentApplications";
import { useTournamentResults } from "@/hooks/useTournamentResults";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import { IdentityHeader } from "@/components/ui/layout/IdentityHeader";
import { ResultInputCard } from "@/components/tournament/admin/ResultInputCard";
import { Trophy } from "lucide-react";

export default function TournamentResultsPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const [refreshKey, setRefreshKey] = useState(0);

  // 대회 정보 조회
  const { tournament, loading: tournamentLoading } = useTournament(
    associationId,
    tournamentId,
    { isAdmin: true }
  );

  // 승인된 신청 목록 조회 (참가 팀)
  const { applications } = useTournamentApplications(
    associationId,
    tournamentId,
    { enabled: true }
  );

  // 기존 결과 조회
  const { results } = useTournamentResults({
    enabled: true,
    tournamentId,
  });

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

  // 승인된 신청만 필터링
  const approvedApplications = applications.filter(
    (app) => app.status?.toUpperCase() === "APPROVED"
  );

  const handleSaved = () => {
    // 저장 후 목록 새로고침
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <HubLayout
      header={
        <IdentityHeader
          title={tournament.title || tournament.name || "대회명 없음"}
          subtitle="대회 결과 입력"
          meta={
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Trophy className="w-4 h-4" />
              <span>참가 팀: {approvedApplications.length}팀</span>
            </div>
          }
        />
      }
      persona={
        <div className="px-4 py-6 space-y-4">
          {approvedApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600">승인된 참가 팀이 없습니다.</p>
            </div>
          ) : (
            approvedApplications.map((app) => {
              const existingResult = results.find((r) => r.teamId === app.teamId);
              return (
                <ResultInputCard
                  key={app.id}
                  teamId={app.teamId}
                  teamName={app.teamName}
                  tournamentId={tournamentId!}
                  existingResult={existingResult}
                  onSaved={handleSaved}
                />
              );
            })
          )}
        </div>
      }
      // OpportunitySection 없음
    />
  );
}
