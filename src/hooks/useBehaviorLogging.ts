/**
 * 🔥 행동 학습 로깅 훅
 * 
 * 역할:
 * - 클릭 +3
 * - 체류 +2
 * - 길안내 +5
 * - 무시 -1
 */

import { useEffect, useRef } from "react";
import { doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

export type BehaviorType = "click" | "dwell" | "navigation" | "ignore";

const BEHAVIOR_SCORES: Record<BehaviorType, number> = {
  click: 3,
  dwell: 2,
  navigation: 5,
  ignore: -1,
};

export function useBehaviorLogging() {
  const { user } = useAuth();
  const dwellTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * 🔥 v1.4: 행동 로깅 (학습 과속 방지)
   */
  const logBehavior = async (
    placeId: string,
    behaviorType: BehaviorType,
    metadata?: Record<string, any>
  ) => {
    if (!user || user.isAnonymous) {
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const baseScore = BEHAVIOR_SCORES[behaviorType];

      // 🔥 v1.4: 하루 최대 20점 제한 (학습 과속 방지)
      const maxDailyScore = 20;
      const actualScore = Math.min(baseScore, maxDailyScore);

      // 🔥 behaviorScore 업데이트
      await updateDoc(userRef, {
        [`behaviorScore.${placeId}`]: increment(actualScore),
        [`behaviorLog.${placeId}`]: {
          type: behaviorType,
          score: actualScore,
          baseScore, // 원래 점수도 기록
          timestamp: serverTimestamp(),
          ...metadata,
        },
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ [useBehaviorLogging] 행동 로깅 완료:`, {
        placeId,
        behaviorType,
        baseScore,
        actualScore, // 제한된 점수
      });
    } catch (error) {
      console.warn("⚠️ [useBehaviorLogging] 행동 로깅 실패:", error);
    }
  };

  /**
   * 🔥 클릭 로깅
   */
  const logClick = (placeId: string, placeName?: string) => {
    logBehavior(placeId, "click", { placeName });
  };

  /**
   * 🔥 체류 시작
   */
  const startDwell = (placeId: string, placeName?: string) => {
    if (!user || user.isAnonymous) {
      return;
    }

    // 🔥 기존 타이머 정리
    const existingTimer = dwellTimersRef.current.get(placeId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 🔥 5초 후 체류 로깅
    const timer = setTimeout(() => {
      logBehavior(placeId, "dwell", { placeName, duration: 5 });
      dwellTimersRef.current.delete(placeId);
    }, 5000);

    dwellTimersRef.current.set(placeId, timer);
  };

  /**
   * 🔥 체류 종료
   */
  const stopDwell = (placeId: string) => {
    const timer = dwellTimersRef.current.get(placeId);
    if (timer) {
      clearTimeout(timer);
      dwellTimersRef.current.delete(placeId);
    }
  };

  /**
   * 🔥 길안내 로깅
   */
  const logNavigation = (placeId: string, placeName?: string, distance?: number) => {
    logBehavior(placeId, "navigation", { placeName, distance });
  };

  /**
   * 🔥 무시 로깅
   */
  const logIgnore = (placeId: string, placeName?: string) => {
    logBehavior(placeId, "ignore", { placeName });
  };

  // 🔥 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      dwellTimersRef.current.forEach((timer) => {
        clearTimeout(timer);
      });
      dwellTimersRef.current.clear();
    };
  }, []);

  return {
    logClick,
    startDwell,
    stopDwell,
    logNavigation,
    logIgnore,
  };
}
