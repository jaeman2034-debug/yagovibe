/**
 * 🔥 useGrowthData - 성장 데이터 조회 훅
 * 
 * 역할:
 * - 오늘 컨디션 자동 로드
 * - 오늘 루틴 체크 자동 로드
 * - 실시간 구독 (선택적)
 * 
 * UX 목적:
 * - 성장 탭 진입 시 자동 데이터 로드
 * - 사용자 편의성 향상
 */

import { useEffect, useState } from "react";
import {
  getTodayCondition,
  getTodayRoutine,
  type DailyCondition,
  type RoutineCheck,
} from "@/services/growthService";

/**
 * 🔥 성장 데이터 조회 훅
 * 
 * @param uid 사용자 UID
 * @returns 컨디션, 루틴, 로딩 상태
 */
export function useGrowthData(uid?: string) {
  const [condition, setCondition] = useState<DailyCondition | null>(null);
  const [routine, setRoutine] = useState<RoutineCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // 🔥 병렬 로드
        const [conditionData, routineData] = await Promise.all([
          getTodayCondition(uid),
          getTodayRoutine(uid),
        ]);

        setCondition(conditionData);
        setRoutine(routineData);
      } catch (error) {
        console.error("❌ [useGrowthData] 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [uid]);

  return {
    condition,
    routine,
    loading,
    // 🔥 업데이트 함수 (로컬 상태 갱신용)
    updateCondition: setCondition,
    updateRoutine: setRoutine,
  };
}
