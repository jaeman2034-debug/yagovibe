/**
 * 🔥 Tournament 상세 페이지 (STEP 15A: Persona 기반 3-Layer 구조)
 * /association/:associationId/tournaments/:tournamentId
 * 
 * 핵심 원칙:
 * - 대회 페이지는 '참가자 전용 화면'이 아니라 '대회 정보 + 참여 관계를 보여주는 허브'
 * - 참가 안 해도 정상 UX
 * - 3-Layer 고정: IdentityHeader + PersonaSection + OpportunitySection
 */

import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useTournament } from "@/hooks/useTournament";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";
import { resolveTournamentPersona } from "@/pages/tournament/resolveTournamentPersona";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import { PersonaSection as UIPersonaSection } from "@/components/ui/layout/PersonaSection";
import { OpportunitySection as UIOpportunitySection } from "@/components/ui/layout/OpportunitySection";
import { TournamentIdentityHeader } from "@/components/tournament/IdentityHeader";
import { TournamentPersonaSection } from "@/components/tournament/PersonaSection";
import { TournamentOpportunitySection } from "@/components/tournament/OpportunitySection";
import { TeamApplicationForm } from "@/components/tournament/TeamApplicationForm";
import { useState } from "react";
import type { FeePolicy } from "@/components/notice/FeeSummaryBox";
import { DEFAULT_FEE_POLICY } from "@/lib/notice/feeCalc";


export default function TournamentDetailPage() {
  // ✅ 모든 Hooks는 무조건 최상단에 배치 (React Hooks 규칙)
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAssociationAdmin(associationId);

  // 🔥 STEP 15A: 데이터 훅 (재사용 규칙 준수)
  const { tournament, loading: tournamentLoading } = useTournament(
    associationId,
    tournamentId,
    { isAdmin: isAdmin || false }
  );
  const { teamMembers, hasTeams, teamCount } = useMyTeams();
  const { applications } = useMyTournamentApplications();

  // 🔥 Persona 판별
  const isTeamCaptain = teamMembers.some(
    (tm) => tm.role === "admin" || tm.accessLevel === "OWNER"
  );
  const hasApplication = applications.some(
    (app) =>
      app.associationId === associationId && app.tournamentId === tournamentId
  );

  const persona = resolveTournamentPersona({
    isLoggedIn: !!user,
    isAdmin: isAdmin || false,
    hasTeams,
    isTeamCaptain,
    hasApplication,
  });

  // 🔥 신청 폼 상태
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // 🔥 참가비 정책 추출
  const getFeePolicy = (): FeePolicy | undefined => {
    if (!tournament) return undefined;

    if ((tournament as any).feePolicy) {
      return (tournament as any).feePolicy;
    }

    if (tournament.feeAmount) {
      return {
        baseFee: tournament.feeAmount,
        baseTeamCount: DEFAULT_FEE_POLICY.baseTeamCount,
        extraFeePerTeam: DEFAULT_FEE_POLICY.extraFeePerTeam,
      };
    }

    return DEFAULT_FEE_POLICY;
  };

  const handleApply = () => {
    setShowApplicationForm(true);
  };

  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);
  };

  // 🔥 로딩 상태
  if (tournamentLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 🔥 대회 없음
  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-16 px-4">
          <div className="text-center">
            <p className="text-gray-500 mb-4">대회를 찾을 수 없습니다.</p>
            <button
              onClick={() => navigate(`/association/${associationId}/tournaments`)}
              className="text-blue-600 hover:text-blue-800"
            >
              대회 목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 STEP 15B: HubLayout 사용 (3-Layer 고정 구조)
  return (
    <HubLayout
      header={<TournamentIdentityHeader tournament={tournament} />}
      persona={
        <UIPersonaSection
          persona={persona}
          map={{
            ANON: (
              <TournamentPersonaSection
                persona={persona}
                tournament={tournament}
                associationId={associationId}
                tournamentId={tournamentId}
                hasTeams={hasTeams}
                isTeamCaptain={isTeamCaptain}
                hasApplication={hasApplication}
                navigate={navigate}
              />
            ),
            P0: (
              <TournamentPersonaSection
                persona={persona}
                tournament={tournament}
                associationId={associationId}
                tournamentId={tournamentId}
                hasTeams={hasTeams}
                isTeamCaptain={isTeamCaptain}
                hasApplication={hasApplication}
                navigate={navigate}
              />
            ),
            P1: (
              <TournamentPersonaSection
                persona={persona}
                tournament={tournament}
                associationId={associationId}
                tournamentId={tournamentId}
                hasTeams={hasTeams}
                isTeamCaptain={isTeamCaptain}
                hasApplication={hasApplication}
                navigate={navigate}
              />
            ),
            P2: (
              <TournamentPersonaSection
                persona={persona}
                tournament={tournament}
                associationId={associationId}
                tournamentId={tournamentId}
                hasTeams={hasTeams}
                isTeamCaptain={isTeamCaptain}
                hasApplication={hasApplication}
                navigate={navigate}
              />
            ),
            P3: (
              <TournamentPersonaSection
                persona={persona}
                tournament={tournament}
                associationId={associationId}
                tournamentId={tournamentId}
                hasTeams={hasTeams}
                isTeamCaptain={isTeamCaptain}
                hasApplication={hasApplication}
                navigate={navigate}
              />
            ),
            P4: (
              <TournamentPersonaSection
                persona={persona}
                tournament={tournament}
                associationId={associationId}
                tournamentId={tournamentId}
                hasTeams={hasTeams}
                isTeamCaptain={isTeamCaptain}
                hasApplication={hasApplication}
                navigate={navigate}
              />
            ),
          }}
        />
      }
      opportunity={
        <UIOpportunitySection
          persona={persona}
          map={{
            P3: (
              <TournamentOpportunitySection
                persona={persona}
                associationId={associationId}
                tournamentId={tournamentId}
                onApply={handleApply}
              />
            ),
          }}
        />
      }
    >
      {/* 참가팀 신청 폼 */}
      {showApplicationForm && getFeePolicy() && (
        <div className="px-4 mt-6">
          <TeamApplicationForm
            associationId={associationId!}
            tournamentId={tournamentId!}
            tournamentName={tournament.name}
            tournament={tournament}
            feePolicy={getFeePolicy()}
            onSuccess={handleApplicationSuccess}
            onClose={() => setShowApplicationForm(false)}
          />
        </div>
      )}
    </HubLayout>
  );
}
