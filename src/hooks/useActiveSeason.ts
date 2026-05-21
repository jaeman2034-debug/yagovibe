/**
 * 🔥 useActiveSeason - 활성 시즌 조회 훅 (STEP: 시즌/연도 관리 시스템)
 * 
 * 핵심 원칙:
 * - 활성 시즌은 항상 1개만
 * - 관리자 설정 + 참조
 * - 시즌 없으면 null (정상 상태)
 */

import { useSeasons } from "@/hooks/useSeasons";
import type { Season } from "@/types/season";

export function useActiveSeason() {
  const { seasons, loading } = useSeasons({ enabled: true });

  // 활성 시즌 찾기
  const activeSeason = seasons.find((s) => s.isActive) || null;

  return {
    activeSeason,
    loading,
    seasonId: activeSeason?.id || null,
  };
}
