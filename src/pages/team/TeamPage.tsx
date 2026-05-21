/**
 * 🔥 TeamPage - 팀 페이지 (STEP 14: Persona 패턴 적용)
 * 
 * STEP 14 설계 원칙:
 * - /me와 동일한 3-Layer 구조
 * - Persona 기반 분기 (P0 ~ P4)
 * - 팀이 없어도 / 있어도 / 관리자가 아니어도 안 터짐
 * - "팀 중심 UX"의 오해를 제거하고 개인→팀 전환을 부드럽게 만든다
 * 
 * 핵심 원칙:
 * - 팀 페이지는 '팀을 가진 사람만의 공간'이 아니라 '팀과의 관계를 보여주는 허브'다
 * - 팀 없으면 접근 불가 ❌ / 에러 화면 ❌ / "팀을 먼저 만드세요" 메인 강요 ❌
 */

import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";
import { isAdminUser } from "@/utils/auditLog";
import { resolvePersona } from "@/components/ui/personas/resolvePersona";
import type { Persona } from "@/components/ui/personas/types";
import { TeamPageLayout } from "./TeamPageLayout";
import { TeamIdentityHeader } from "@/components/team/TeamIdentityHeader";
import { TeamPersonaSection } from "@/components/team/TeamPersonaSection";
import { TeamOpportunitySection } from "@/components/team/TeamOpportunitySection";
import { MeSkeleton } from "@/components/me/MeSkeleton";

export default function TeamPage() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const { user, logout } = useAuth();
  
  // 🔥 STEP 14: 데이터 훅 직접 호출 (Persona 판단 로직은 resolvePersona에만)
  const profile = useMyProfile();
  const teams = useMyTeams();
  const applications = useMyTournamentApplications();
  const isPlatformAdmin = isAdminUser();
  
  // 🔥 STEP 14: 로딩 상태 (데이터 훅이 로딩 중)
  if (profile.loading || teams.loading || applications.isLoading) {
    return <MeSkeleton />;
  }
  
  // 🔥 STEP 14: 로그인 여부 체크
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }
  
  // 🔥 STEP 14: Persona 판단 (resolvePersona만 사용, 조건문 없음)
  const persona: Persona = resolvePersona({
    isLoggedIn: true,
    hasProfile: profile.hasProfile,
    teamCount: teams.teamCount,
    applicationCount: applications.applications.length,
    role: isPlatformAdmin ? "ADMIN" : "USER",
  });
  
  // STEP 14: PersonaData (TeamPersonaSection에 전달용)
  const personaData = {
    hasTeam: teams.hasTeams,
    isTeamCaptain: teams.teamMembers.some(
      (tm) => tm.role === "admin" || tm.accessLevel === "OWNER"
    ),
    isAssociationAdmin: isPlatformAdmin,
    hasApplications: applications.applications.length > 0,
    profileComplete: profile.hasProfile,
    teamCount: teams.teamCount,
    applicationCount: applications.applications.length,
  };

  // 🔥 STEP 14: ANON 처리 (이론적으로는 위에서 이미 처리되지만 방어 코드)
  if (persona === "ANON") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }
  
  // 🔥 STEP 14: 에러 분기 없음
  // 모든 에러는 데이터 훅에서 빈 배열/기본값으로 흡수됨
  // 여기까지 왔다는 건 100% 안전한 상태
  // /team 안에는 비즈니스 판단 로직이 남아 있으면 안 된다
  
  const handleSettings = () => {
    navigate("/me/settings");
  };
  
  const handleLogout = async () => {
    if (confirm("로그아웃하시겠습니까?")) {
      await logout();
      navigate("/");
    }
  };
  
  const handleCreateTeam = () => {
    navigate(`/sports/${type || "football"}/team/create`);
  };
  
  const handleJoinTeam = () => {
    navigate("/team/join");
  };
  
  const handleApplyTournament = () => {
    navigate("/tournaments");
  };
  
  // 🔥 STEP 14: 렌더링 (3-Layer 고정 구조)
  return (
    <TeamPageLayout>
      {/* ① TeamIdentityHeader - 항상 렌더링 */}
      <TeamIdentityHeader
        user={user}
        persona={persona}
        stats={{
          teamCount: teams.teamCount,
          isTeamCaptain: personaData.isTeamCaptain,
        }}
        onSettings={handleSettings}
        onLogout={handleLogout}
      />
      
      {/* ② TeamPersonaSection - Persona별 분기 (CTA 없음) */}
      <TeamPersonaSection
        persona={persona}
        personaData={personaData}
        navigate={navigate}
      />
      
      {/* ③ TeamOpportunitySection - 조건부 CTA 유도 (CTA만 있음) */}
      <TeamOpportunitySection
        persona={persona}
        onCreateTeam={handleCreateTeam}
        onJoinTeam={handleJoinTeam}
        onApplyTournament={handleApplyTournament}
      />
    </TeamPageLayout>
  );
}
