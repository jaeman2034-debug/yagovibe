/**
 * 🔥 코치 대시보드 서비스
 * 
 * 역할:
 * - 선수 상태 집계
 * - 위험 선수 자동 표시
 * - 팀 전체 컨디션 분석
 * 
 * UX 목적:
 * - 코치가 선수 상태를 한눈에 파악
 * - 부상 위험 선수 조기 발견
 * - 팀 관리 효율화
 */

import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DailyCondition } from "./growthService";
import type { TrainingLoad } from "@/hooks/useTrainingLoad";
import { calculateRhythmScoreV2 } from "@/utils/rhythmCalculator";

/**
 * 🔥 선수 상태 요약
 */
export interface PlayerStatus {
  uid: string;
  name: string;
  avatar?: string;
  rhythmScore: number | null; // 0~100
  trainingLoad: {
    loadRatio: number;
    status: "low" | "normal" | "high" | "danger";
  };
  condition: {
    pain: number; // 0~10
    fatigue: number; // 1~5
    sleepHours?: number;
  };
  riskLevel: "low" | "medium" | "high" | "critical"; // 위험 수준
  lastUpdate: Date | null;
  recommendations: string[]; // 코치 권장사항
}

/**
 * 🔥 위험 선수 필터
 */
export type RiskFilter = "all" | "high" | "critical";

/**
 * 🔥 코치 대시보드 데이터
 */
export interface CoachDashboard {
  players: PlayerStatus[];
  totalPlayers: number;
  riskPlayers: {
    critical: number;
    high: number;
    medium: number;
  };
  teamAverage: {
    rhythmScore: number | null;
    trainingLoad: number;
    painLevel: number;
  };
}

/**
 * 🔥 위험 수준 계산
 */
function calculateRiskLevel(
  rhythmScore: number | null,
  loadRatio: number,
  pain: number,
  fatigue: number
): "low" | "medium" | "high" | "critical" {
  // 🔥 Critical: 통증 높음 또는 과부하 위험
  if (pain >= 7 || loadRatio > 1.6) {
    return "critical";
  }

  // 🔥 High: 리듬 낮음 + 부하 높음 또는 통증 중간
  if (
    (rhythmScore !== null && rhythmScore < 40 && loadRatio > 1.2) ||
    pain >= 5
  ) {
    return "high";
  }

  // 🔥 Medium: 리듬 낮음 또는 부하 높음
  if (
    (rhythmScore !== null && rhythmScore < 60) ||
    loadRatio > 1.2 ||
    fatigue >= 4
  ) {
    return "medium";
  }

  return "low";
}

/**
 * 🔥 코치 권장사항 생성
 */
function generateRecommendations(
  riskLevel: "low" | "medium" | "high" | "critical",
  rhythmScore: number | null,
  loadRatio: number,
  pain: number
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === "critical") {
    if (pain >= 7) {
      recommendations.push("즉시 휴식 필요");
      recommendations.push("의료진 상담 권장");
    }
    if (loadRatio > 1.6) {
      recommendations.push("훈련량 즉시 감소");
      recommendations.push("회복 훈련으로 전환");
    }
  } else if (riskLevel === "high") {
    if (rhythmScore !== null && rhythmScore < 40) {
      recommendations.push("회복 훈련 권장");
      recommendations.push("수면 및 영양 점검");
    }
    if (loadRatio > 1.2) {
      recommendations.push("훈련 강도 조절");
    }
    if (pain >= 5) {
      recommendations.push("통증 모니터링 필요");
    }
  } else if (riskLevel === "medium") {
    if (rhythmScore !== null && rhythmScore < 60) {
      recommendations.push("컨디션 관리 필요");
    }
    if (loadRatio > 1.2) {
      recommendations.push("훈련량 점검");
    }
  }

  return recommendations;
}

/**
 * 🔥 선수 상태 조회
 * 
 * @param playerUid 선수 UID
 * @returns 선수 상태
 */
export async function getPlayerStatus(
  playerUid: string
): Promise<PlayerStatus | null> {
  try {
    // 🔥 1. 오늘 컨디션 조회
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const conditionRef = collection(db, "dailyCondition");
    const conditionQuery = query(
      conditionRef,
      where("uid", "==", playerUid),
      where("date", "==", todayStr)
    );
    const conditionSnap = await getDocs(conditionQuery);

    let condition: DailyCondition | null = null;
    if (!conditionSnap.empty) {
      condition = conditionSnap.docs[0].data() as DailyCondition;
    }

    // 🔥 2. 최근 14일 활동 기록 조회 (훈련 부하 계산)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const activityRef = collection(db, "activityHistory");
    const activityQuery = query(
      activityRef,
      where("uid", "==", playerUid),
      where("endedAt", ">=", Timestamp.fromDate(fourteenDaysAgo))
    );
    const activitySnap = await getDocs(activityQuery);

    let recent3Days = 0;
    let total14Days = 0;
    let count14Days = 0;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    activitySnap.docs.forEach((doc) => {
      const data = doc.data();
      const endedAt = data.endedAt?.toDate?.() || (data.endedAt?.seconds ? new Date(data.endedAt.seconds * 1000) : null);
      if (!endedAt) return;

      const durationMin = Math.floor((data.durationMs || 0) / 60000);

      if (endedAt >= threeDaysAgo) {
        recent3Days += durationMin;
      }

      total14Days += durationMin;
      count14Days += 1;
    });

    const avg14Days = count14Days > 0 ? total14Days / count14Days : 0;
    const loadRatio = avg14Days > 0 ? recent3Days / avg14Days : 0;

    let loadStatus: "low" | "normal" | "high" | "danger" = "normal";
    if (loadRatio < 0.7) {
      loadStatus = "low";
    } else if (loadRatio >= 0.7 && loadRatio < 1.2) {
      loadStatus = "normal";
    } else if (loadRatio >= 1.2 && loadRatio < 1.6) {
      loadStatus = "high";
    } else {
      loadStatus = "danger";
    }

    // 🔥 3. 리듬 점수 계산
    const rhythmScore = condition
      ? calculateRhythmScoreV2(condition, {
          recent3Days,
          avg14Days: avg14Days,
          loadRatio,
        })
      : null;

    const score100 =
      rhythmScore?.score !== null
        ? (rhythmScore.score > 1 ? rhythmScore.score : rhythmScore.score * 100)
        : null;

    // 🔥 4. 위험 수준 계산
    const riskLevel = calculateRiskLevel(
      score100,
      loadRatio,
      condition?.pain || 0,
      condition?.fatigue || 3
    );

    // 🔥 5. 권장사항 생성
    const recommendations = generateRecommendations(
      riskLevel,
      score100,
      loadRatio,
      condition?.pain || 0
    );

    // 🔥 6. 사용자 정보 조회 (이름, 아바타)
    const userRef = collection(db, "users");
    const userQuery = query(userRef, where("uid", "==", playerUid));
    const userSnap = await getDocs(userQuery);

    let name = "선수";
    let avatar: string | undefined;

    if (!userSnap.empty) {
      const userData = userSnap.docs[0].data();
      name = userData.name || userData.displayName || "선수";
      avatar = userData.avatar || userData.photoURL;
    }

    return {
      uid: playerUid,
      name,
      avatar,
      rhythmScore: score100,
      trainingLoad: {
        loadRatio,
        status: loadStatus,
      },
      condition: {
        pain: condition?.pain || 0,
        fatigue: condition?.fatigue || 3,
        sleepHours: condition?.sleepHours,
      },
      riskLevel,
      lastUpdate: condition?.date ? new Date(condition.date) : null,
      recommendations,
    };
  } catch (error) {
    console.error("❌ [getPlayerStatus] 선수 상태 조회 실패:", error);
    return null;
  }
}

/**
 * 🔥 코치 대시보드 데이터 조회
 * 
 * @param playerUids 선수 UID 목록
 * @param riskFilter 위험 필터
 * @returns 코치 대시보드 데이터
 */
export async function getCoachDashboard(
  playerUids: string[],
  riskFilter: RiskFilter = "all"
): Promise<CoachDashboard> {
  try {
    // 🔥 모든 선수 상태 조회
    const playerStatuses = await Promise.all(
      playerUids.map((uid) => getPlayerStatus(uid))
    );

    const validPlayers = playerStatuses.filter(
      (status): status is PlayerStatus => status !== null
    );

    // 🔥 위험 필터 적용
    let filteredPlayers = validPlayers;
    if (riskFilter === "high") {
      filteredPlayers = validPlayers.filter(
        (p) => p.riskLevel === "high" || p.riskLevel === "critical"
      );
    } else if (riskFilter === "critical") {
      filteredPlayers = validPlayers.filter((p) => p.riskLevel === "critical");
    }

    // 🔥 위험 선수 통계
    const riskPlayers = {
      critical: validPlayers.filter((p) => p.riskLevel === "critical").length,
      high: validPlayers.filter((p) => p.riskLevel === "high").length,
      medium: validPlayers.filter((p) => p.riskLevel === "medium").length,
    };

    // 🔥 팀 평균 계산
    const validScores = validPlayers
      .map((p) => p.rhythmScore)
      .filter((s): s is number => s !== null);
    const avgRhythmScore =
      validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : null;

    const avgLoadRatio =
      validPlayers.length > 0
        ? validPlayers.reduce((a, b) => a + b.trainingLoad.loadRatio, 0) /
          validPlayers.length
        : 0;

    const avgPain =
      validPlayers.length > 0
        ? validPlayers.reduce((a, b) => a + b.condition.pain, 0) /
          validPlayers.length
        : 0;

    return {
      players: filteredPlayers,
      totalPlayers: validPlayers.length,
      riskPlayers,
      teamAverage: {
        rhythmScore: avgRhythmScore,
        trainingLoad: avgLoadRatio,
        painLevel: avgPain,
      },
    };
  } catch (error) {
    console.error("❌ [getCoachDashboard] 대시보드 조회 실패:", error);
    return {
      players: [],
      totalPlayers: 0,
      riskPlayers: { critical: 0, high: 0, medium: 0 },
      teamAverage: {
        rhythmScore: null,
        trainingLoad: 0,
        painLevel: 0,
      },
    };
  }
}
