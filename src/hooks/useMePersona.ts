/**
 * 🔥 마이페이지 Persona 감지 Hook
 * 
 * Persona 정의:
 * - P0: 완전 신규 (가입만)
 * - P1: 개인 체육인 (팀·대회 없음, 의도적)
 * - P2: 팀 소속 선수
 * - P3: 팀장
 * - P4: 협회 관리자
 */

import { useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";
import { isAdminUser } from "@/utils/auditLog";

export type Persona = "P0" | "P1" | "P2" | "P3" | "P4";

export interface PersonaData {
  persona: Persona;
  hasTeam: boolean;
  isTeamCaptain: boolean;
  isAssociationAdmin: boolean;
  hasApplications: boolean;
  profileComplete: boolean;
  teamCount: number;
  applicationCount: number;
}

/**
 * 🔥 Persona 감지 Hook
 * 
 * 우선순위: P4 > P3 > P2 > P1 > P0
 */
export function useMePersona(): PersonaData & { loading: boolean } {
  const { user } = useAuth();
  const { teamMembers, loading: teamsLoading, hasTeams, teamCount } = useMyTeams();
  const { applications, isLoading: applicationsLoading } = useMyTournamentApplications();
  const isPlatformAdmin = isAdminUser(); // 플랫폼 전체 관리자
  // 🔥 협회 관리자 확인: 특정 협회 관리자는 Persona Layer에서 별도 처리
  // TODO: 여러 협회 관리자일 경우 P4 Persona 내에서 분기 처리
  
  // 🔥 Persona 결정 로직
  const personaData = useMemo((): PersonaData => {
    // 기본값 (로딩 중)
    const defaultData: PersonaData = {
      persona: "P0",
      hasTeam: false,
      isTeamCaptain: false,
      isAssociationAdmin: false,
      hasApplications: false,
      profileComplete: false,
      teamCount: 0,
      applicationCount: 0,
    };
    
    if (!user?.uid) {
      return defaultData;
    }
    
    // 데이터 수집
    const hasTeam = hasTeams && teamCount > 0;
    const isTeamCaptain = teamMembers.some(
      (tm) => tm.role === "admin" || tm.accessLevel === "OWNER"
    );
    const isAssociationAdmin = isPlatformAdmin; // 플랫폼 전체 관리자만 P4로 분류
    const hasApplications = Array.isArray(applications) && applications.length > 0;
    const profileComplete = !!(user.displayName || user.email);
    
    // 🔥 Persona 우선순위 결정
    let persona: Persona = "P0";
    
    // P4: 협회 관리자 (최우선)
    if (isAssociationAdmin) {
      persona = "P4";
    }
    // P3: 팀장
    else if (hasTeam && isTeamCaptain) {
      persona = "P3";
    }
    // P2: 팀 소속 선수
    else if (hasTeam && !isTeamCaptain) {
      persona = "P2";
    }
    // P1: 개인 체육인 (팀 없음, 프로필 완성)
    else if (!hasTeam && profileComplete) {
      persona = "P1";
    }
    // P0: 완전 신규
    else {
      persona = "P0";
    }
    
    return {
      persona,
      hasTeam,
      isTeamCaptain,
      isAssociationAdmin,
      hasApplications,
      profileComplete,
      teamCount,
      applicationCount: Array.isArray(applications) ? applications.length : 0,
    };
  }, [
    user?.uid,
    user?.displayName,
    user?.email,
    hasTeams,
    teamCount,
    teamMembers,
    isPlatformAdmin,
    applications,
  ]);
  
  const loading = teamsLoading || applicationsLoading;
  
  return {
    ...personaData,
    loading,
  };
}
