/**
 * 🔥 useGrowthNotifications - 성장 알림 조회 훅
 * 
 * 역할:
 * - 리듬/훈련부하/Streak 기반 알림 생성
 * - 실시간 알림 표시
 * 
 * UX 목적:
 * - 행동 유지 강화
 * - 사용자 습관 통제
 */

import { useMemo, useEffect, useState } from "react";
import { useRhythmData } from "./useRhythmData";
import { useTrainingLoad } from "./useTrainingLoad";
import { useRoutineStreak } from "./useRoutineStreak";
import { useAuth } from "@/context/AuthProvider";
import {
  generateGrowthNotifications,
  saveGrowthNotification,
  showLocalNotification,
  type GrowthNotification,
} from "@/utils/growthNotifications";
import { getTodayRoutine, getTodayDateString } from "@/services/growthService";

/**
 * 🔥 성장 알림 조회 훅
 * 
 * @returns 알림 목록, 로딩 상태
 */
export function useGrowthNotifications() {
  const { user } = useAuth();
  const { rhythmScores, loading: rhythmLoading } = useRhythmData(user?.uid);
  const { load: trainingLoad, loading: loadLoading } = useTrainingLoad(user?.uid);
  const { streak, loading: streakLoading } = useRoutineStreak(user?.uid);
  const [yesterdayRoutineChecked, setYesterdayRoutineChecked] = useState(false);
  const [checkingRoutine, setCheckingRoutine] = useState(true);

  // 🔥 어제 루틴 체크 여부 확인
  useEffect(() => {
    if (!user?.uid) {
      setCheckingRoutine(false);
      return;
    }

    const checkYesterdayRoutine = async () => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, "0");
        const day = String(yesterday.getDate()).padStart(2, "0");
        const yesterdayStr = `${year}-${month}-${day}`;

        const { getTodayRoutine } = await import("@/services/growthService");
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");

        // 🔥 어제 루틴 문서 조회
        const docId = `${yesterdayStr}_${user.uid}`;
        const routineRef = doc(db, "routineCheck", docId);
        const snap = await getDoc(routineRef);

        if (snap.exists()) {
          const data = snap.data();
          // 🔥 하나라도 체크되면 OK
          const checked =
            data.stretch || data.strength || data.analysis || data.mental;
          setYesterdayRoutineChecked(checked);
        } else {
          setYesterdayRoutineChecked(false);
        }
      } catch (error) {
        console.error("❌ [useGrowthNotifications] 어제 루틴 확인 실패:", error);
        setYesterdayRoutineChecked(false);
      } finally {
        setCheckingRoutine(false);
      }
    };

    checkYesterdayRoutine();
  }, [user?.uid]);

  const notifications = useMemo(() => {
    if (rhythmLoading || loadLoading || streakLoading || checkingRoutine) {
      return [];
    }

    return generateGrowthNotifications(
      rhythmScores,
      trainingLoad,
      streak,
      yesterdayRoutineChecked
    );
  }, [
    rhythmScores,
    trainingLoad,
    streak,
    yesterdayRoutineChecked,
    rhythmLoading,
    loadLoading,
    streakLoading,
    checkingRoutine,
  ]);

  // 🔥 알림 생성 시 Firestore 저장 및 Local Notification 표시
  useEffect(() => {
    if (!user?.uid || notifications.length === 0) return;

    const processNotifications = async () => {
      for (const notification of notifications) {
        try {
          // 🔥 Firestore 저장
          await saveGrowthNotification(user.uid, notification);

          // 🔥 Local Notification 표시 (최우선 알림만)
          if (notification.priority === "high") {
            await showLocalNotification(notification);
          }
        } catch (error) {
          console.error(
            "❌ [useGrowthNotifications] 알림 처리 실패:",
            error
          );
        }
      }
    };

    processNotifications();
  }, [notifications, user?.uid]);

  const loading = rhythmLoading || loadLoading || streakLoading || checkingRoutine;

  return {
    notifications,
    loading,
  };
}
