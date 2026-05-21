/**
 * 🔥 useAITrainingRecommendation - AI 훈련 추천 훅
 * 
 * 역할:
 * - 리듬/훈련부하/컨디션 기반 추천 생성
 * - 실시간 추천 업데이트
 * 
 * UX 목적:
 * - 개인 맞춤 훈련 제안
 * - 사용자 몰입도 상승
 */

import { useMemo } from "react";
import { useRhythmData } from "./useRhythmData";
import { useTrainingLoad } from "./useTrainingLoad";
import { useGrowthData } from "./useGrowthData";
import { useActivityStats } from "./useActivityStats";
import { useAuth } from "@/context/AuthProvider";
import {
  generateTrainingRecommendation,
  generateWeeklyTrainingRoadmap,
  type TrainingRecommendation,
  type RecommendationContext,
} from "@/services/aiTrainingRecommendation";

/**
 * 🔥 AI 훈련 추천 조회 훅
 * 
 * @param includeRoadmap 주간 로드맵 포함 여부
 * @returns 추천, 로드맵, 로딩 상태
 */
export function useAITrainingRecommendation(includeRoadmap: boolean = false) {
  const { user } = useAuth();
  const { rhythmScores, loading: rhythmLoading } = useRhythmData(user?.uid);
  const { load: trainingLoad, loading: loadLoading } = useTrainingLoad(user?.uid);
  const { todayCondition, loading: conditionLoading } = useGrowthData(user?.uid);
  const { weekCount } = useActivityStats(user?.uid);

  const context: RecommendationContext = useMemo(() => {
    const todayScore =
      rhythmScores.length > 0 ? rhythmScores[rhythmScores.length - 1] : null;

    return {
      rhythmScore: todayScore,
      trainingLoad: trainingLoad || null,
      condition: todayCondition || null,
      recentActivityCount: weekCount || 0,
    };
  }, [rhythmScores, trainingLoad, todayCondition, weekCount]);

  const recommendation = useMemo(() => {
    if (rhythmLoading || loadLoading || conditionLoading) {
      return null;
    }

    return generateTrainingRecommendation(context);
  }, [context, rhythmLoading, loadLoading, conditionLoading]);

  const roadmap = useMemo(() => {
    if (!includeRoadmap || !recommendation) {
      return [];
    }

    return generateWeeklyTrainingRoadmap(context, 7);
  }, [includeRoadmap, context, recommendation]);

  const loading = rhythmLoading || loadLoading || conditionLoading;

  return {
    recommendation,
    roadmap,
    loading,
  };
}
