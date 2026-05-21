/**
 * 🔥 growthNotifications - 성장 알림 유틸
 * 
 * 역할:
 * - 리듬 하락 감지
 * - 루틴 끊김 직전 감지
 * - 훈련 적기 감지
 * 
 * UX 목적:
 * - 행동 유지 강화
 * - 사용자 습관 통제
 */

import type { RhythmScore } from "./rhythmCalculator";
import { calculateRhythmTrend } from "./rhythmCalculator";
import type { TrainingLoad } from "@/hooks/useTrainingLoad";
import type { RoutineStreak } from "@/services/growthService";

/**
 * 🔥 알림 타입 (핵심 4개만)
 */
export type GrowthNotificationType =
  | "overload" // 과부하 경고
  | "rhythmDrop" // 리듬 하락
  | "trainingReady" // 훈련 적기
  | "streakBreak"; // 루틴 끊김

/**
 * 🔥 알림 데이터
 */
export interface GrowthNotification {
  type: GrowthNotificationType;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  icon: string;
  color: string;
  bgColor: string;
  actionUrl?: string; // 클릭 시 이동할 URL
}

/**
 * 🔥 Firestore 알림 문서 타입
 */
export interface GrowthNotificationDoc {
  uid: string;
  type: GrowthNotificationType;
  message: string;
  createdAt: any; // Timestamp
  read: boolean;
}

/**
 * 🔥 1) 과부하 경고 알림 생성
 * 조건: loadRatio > 1.2
 */
function createOverloadNotification(): GrowthNotification {
  return {
    type: "overload",
    title: "과부하 경고",
    message: "최근 훈련량이 높습니다. 오늘은 회복 훈련을 권장합니다.",
    priority: "high",
    icon: "⚠️",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    actionUrl: "/growth",
  };
}

/**
 * 🔥 2) 리듬 하락 알림 생성
 * 조건: 최근 3일 평균 < 이전 3일 평균 -10%
 */
function createRhythmDropNotification(): GrowthNotification {
  return {
    type: "rhythmDrop",
    title: "리듬 하락",
    message: "컨디션이 떨어지고 있습니다. 수면과 회복을 점검하세요.",
    priority: "medium",
    icon: "📉",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
    actionUrl: "/growth",
  };
}

/**
 * 🔥 3) 훈련 적기 알림 생성
 * 조건: rhythm > 80 AND loadRatio 정상
 */
function createTrainingReadyNotification(): GrowthNotification {
  return {
    type: "trainingReady",
    title: "훈련 적기",
    message: "컨디션 최상입니다. 오늘은 집중 훈련에 적합합니다.",
    priority: "high",
    icon: "🔥",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    actionUrl: "/growth",
  };
}

/**
 * 🔥 4) 루틴 끊김 알림 생성
 * 조건: 어제 루틴 체크 없음
 */
function createStreakBreakNotification(): GrowthNotification {
  return {
    type: "streakBreak",
    title: "루틴 끊김",
    message: "루틴이 끊겼습니다. 오늘 다시 시작해보세요.",
    priority: "high",
    icon: "🔥",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    actionUrl: "/growth",
  };
}

/**
 * 🔥 어제 날짜 문자열 반환 (YYYY-MM-DD)
 */
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 🔥 성장 알림 생성 (핵심 4개만)
 * 
 * @param rhythmScores 리듬 점수 배열 (최근 7일)
 * @param trainingLoad 훈련 부하 데이터
 * @param streak 루틴 Streak 데이터
 * @param yesterdayRoutineChecked 어제 루틴 체크 여부
 * @returns 알림 목록
 */
export function generateGrowthNotifications(
  rhythmScores: RhythmScore[],
  trainingLoad: TrainingLoad | null,
  streak: RoutineStreak | null,
  yesterdayRoutineChecked: boolean
): GrowthNotification[] {
  const notifications: GrowthNotification[] = [];

  // 🔥 1) 과부하 경고 알림
  // 조건: loadRatio > 1.2
  if (trainingLoad && trainingLoad.loadRatio > 1.2) {
    notifications.push(createOverloadNotification());
  }

  // 🔥 2) 리듬 하락 알림
  // 조건: 최근 3일 평균 < 이전 3일 평균 -10%
  if (rhythmScores.length >= 6) {
    const trend = calculateRhythmTrend(rhythmScores);
    if (trend && trend.trend === "down" && trend.diff < -0.1) {
      notifications.push(createRhythmDropNotification());
    }
  }

  // 🔥 3) 훈련 적기 알림
  // 조건: rhythm > 80 AND loadRatio 정상
  if (rhythmScores.length > 0) {
    const todayScore = rhythmScores[rhythmScores.length - 1];
    if (
      todayScore.score !== null &&
      todayScore.score >= 0.8 &&
      trainingLoad &&
      trainingLoad.loadRatio >= 0.7 &&
      trainingLoad.loadRatio <= 1.2
    ) {
      notifications.push(createTrainingReadyNotification());
    }
  }

  // 🔥 4) 루틴 끊김 알림
  // 조건: 어제 루틴 체크 없음
  if (!yesterdayRoutineChecked && streak && streak.currentStreak > 0) {
    notifications.push(createStreakBreakNotification());
  }

  // 🔥 우선순위 정렬 (high → medium → low)
  return notifications.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * 🔥 Firestore에 알림 저장
 * 
 * @param uid 사용자 UID
 * @param notification 알림 데이터
 */
export async function saveGrowthNotification(
  uid: string,
  notification: GrowthNotification
): Promise<void> {
  try {
    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    const docData: GrowthNotificationDoc = {
      uid,
      type: notification.type,
      message: notification.message,
      createdAt: serverTimestamp(),
      read: false,
    };

    await addDoc(collection(db, "growthNotifications"), docData);

    console.log("✅ [saveGrowthNotification] 알림 저장 성공:", notification.type);
  } catch (error) {
    console.error("❌ [saveGrowthNotification] 알림 저장 실패:", error);
    // 🔥 알림 저장 실패해도 UI는 정상 동작
  }
}

/**
 * 🔥 Local Notification 표시 (브라우저 API)
 * 
 * @param notification 알림 데이터
 */
export async function showLocalNotification(
  notification: GrowthNotification
): Promise<void> {
  // 🔥 브라우저 Notification API 사용
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notif = new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico", // 앱 아이콘
        tag: notification.type, // 중복 방지
      });

      // 🔥 클릭 시 해당 페이지로 이동
      notif.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        notif.close();
      };
    } catch (error) {
      console.warn("⚠️ [showLocalNotification] 알림 표시 실패:", error);
    }
  } else if ("Notification" in window && Notification.permission === "default") {
    // 🔥 권한 요청
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.warn("⚠️ [showLocalNotification] 권한 요청 실패:", error);
    }
  }
}
