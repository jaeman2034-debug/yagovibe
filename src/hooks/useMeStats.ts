/**
 * 🔥 마이페이지 통계 데이터 Hook
 * 
 * IdentityHeader에서 사용하는 통계 데이터 제공
 */

import { useMemo } from "react";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";

export interface MeStats {
  teamCount: number;
  tournamentCount: number;
  recordCount: number;
}

/**
 * 🔥 마이페이지 통계 데이터 조회
 */
export function useMeStats(): MeStats & { loading: boolean } {
  const { teamCount, loading: teamsLoading } = useMyTeams();
  const { applications, isLoading: applicationsLoading } = useMyTournamentApplications();
  
  const stats = useMemo((): MeStats => {
    return {
      teamCount: teamCount || 0,
      tournamentCount: Array.isArray(applications) ? applications.length : 0,
      recordCount: 0, // TODO: 개인 기록 수 조회 구현
    };
  }, [teamCount, applications]);
  
  const loading = teamsLoading || applicationsLoading;
  
  return {
    ...stats,
    loading,
  };
}
