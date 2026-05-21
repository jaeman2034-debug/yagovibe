/**
 * 🔥 useCoachDashboard - 코치 대시보드 훅
 * 
 * 역할:
 * - 선수 상태 집계
 * - 위험 선수 자동 표시
 * - 팀 전체 컨디션 분석
 * 
 * UX 목적:
 * - 코치가 선수 상태를 한눈에 파악
 * - 부상 위험 선수 조기 발견
 */

import { useEffect, useState } from "react";
import {
  getCoachDashboard,
  type CoachDashboard,
  type RiskFilter,
} from "@/services/coachDashboardService";

/**
 * 🔥 코치 대시보드 조회 훅
 * 
 * @param playerUids 선수 UID 목록
 * @param riskFilter 위험 필터
 * @returns 대시보드 데이터, 로딩 상태
 */
export function useCoachDashboard(
  playerUids: string[],
  riskFilter: RiskFilter = "all"
) {
  const [dashboard, setDashboard] = useState<CoachDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerUids.length === 0) {
      setDashboard({
        players: [],
        totalPlayers: 0,
        riskPlayers: { critical: 0, high: 0, medium: 0 },
        teamAverage: {
          rhythmScore: null,
          trainingLoad: 0,
          painLevel: 0,
        },
      });
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const data = await getCoachDashboard(playerUids, riskFilter);
        setDashboard(data);
      } catch (error) {
        console.error("❌ [useCoachDashboard] 대시보드 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [playerUids.join(","), riskFilter]);

  return {
    dashboard,
    loading,
  };
}
