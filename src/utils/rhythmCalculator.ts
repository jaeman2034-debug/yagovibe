/**
 * 🔥 rhythmCalculator - 선수 상태 리듬 계산 유틸
 * 
 * 역할:
 * - 컨디션 + 훈련량 + 회복 데이터 기반 리듬 점수 계산
 * - Performance Rhythm 계산
 * 
 * UX 목적:
 * - 선수 상태 리듬 시각화
 * - 훈련 적기/회복기/과부하 위험 판단
 */

import type { DailyCondition } from "@/services/growthService";

/**
 * 🔥 리듬 점수 계산 결과
 */
export interface RhythmScore {
  date: string; // YYYY-MM-DD
  score: number | null; // 0~1 (0 = 최악, 1 = 최상), null = 데이터 없음
  sleepScore: number;
  fatigueScore: number;
  painScore: number;
  loadScore: number;
}

/**
 * 🔥 수면 점수 계산 (0~1)
 * 
 * @param sleepHours 수면 시간
 * @returns 수면 점수 (8시간 = 1.0, 4시간 = 0.5)
 */
export function calculateSleepScore(sleepHours?: number): number {
  if (!sleepHours || sleepHours === 0) return 0.5; // 기본값
  const ideal = 8;
  const score = Math.min(sleepHours / ideal, 1.0); // 최대 1.0
  return Math.max(score, 0); // 최소 0
}

/**
 * 🔥 피로도 점수 계산 (0~1)
 * 
 * @param fatigue 피로도 (1~5, 5가 최악)
 * @returns 피로도 점수 (1 = 1.0, 5 = 0.0)
 */
export function calculateFatigueScore(fatigue?: number): number {
  if (fatigue === undefined || fatigue === null) return 0.5; // 기본값
  return 1 - (fatigue - 1) / 4; // 1~5 → 1.0~0.0
}

/**
 * 🔥 통증 점수 계산 (0~1)
 * 
 * @param pain 통증 (0~10, 10이 최악)
 * @returns 통증 점수 (0 = 1.0, 10 = 0.0)
 */
export function calculatePainScore(pain?: number): number {
  if (pain === undefined || pain === null) return 1.0; // 기본값 (통증 없음)
  return 1 - pain / 10; // 0~10 → 1.0~0.0
}

/**
 * 🔥 최근 활동량 점수 계산 (0~1) - v1 (기본)
 * 
 * @param recentActivityMinutes 최근 3일 활동량 (분)
 * @returns 활동량 점수 (적정량 기준)
 */
export function calculateLoadScore(recentActivityMinutes: number): number {
  // 🔥 적정 활동량: 하루 평균 60분 (3일 = 180분)
  const ideal = 180;
  const score = Math.min(recentActivityMinutes / ideal, 1.0); // 최대 1.0
  // 🔥 과부하 방지: 300분 이상이면 감점
  if (recentActivityMinutes > 300) {
    return Math.max(0.3, 1 - (recentActivityMinutes - 300) / 200);
  }
  return Math.max(score, 0); // 최소 0
}

/**
 * 🔥 훈련 부하 점수 계산 (0~1) - v2 (훈련량 기반)
 * 
 * @param loadRatio 부하 비율 (최근 3일 / 최근 14일 평균)
 * @returns 훈련 부하 점수
 */
export function calculateTrainingLoadScore(loadRatio: number): number {
  // 🔥 부하 비율 기준 점수 계산
  // < 0.7: 컨디션 상승 구간 (1.0)
  // 0.7~1.2: 정상 훈련 (0.8~1.0)
  // 1.2~1.6: 과부하 위험 (0.4~0.8)
  // > 1.6: 부상 위험 (0.0~0.4)

  if (loadRatio < 0.7) {
    // 컨디션 상승 구간
    return 1.0;
  } else if (loadRatio >= 0.7 && loadRatio < 1.2) {
    // 정상 훈련
    const normalized = (loadRatio - 0.7) / 0.5; // 0.7~1.2 → 0~1
    return 1.0 - normalized * 0.2; // 1.0~0.8
  } else if (loadRatio >= 1.2 && loadRatio < 1.6) {
    // 과부하 위험
    const normalized = (loadRatio - 1.2) / 0.4; // 1.2~1.6 → 0~1
    return 0.8 - normalized * 0.4; // 0.8~0.4
  } else {
    // 부상 위험
    const normalized = Math.min((loadRatio - 1.6) / 1.0, 1.0); // 1.6~2.6+ → 0~1
    return 0.4 - normalized * 0.4; // 0.4~0.0
  }
}

/**
 * 🔥 회복 점수 계산 (0~1)
 * 
 * @param recentLoad 최근 3일 활동량
 * @param avgLoad 최근 14일 평균 활동량
 * @returns 회복 점수
 */
export function calculateRecoveryScore(
  recentLoad: number,
  avgLoad: number
): number {
  if (avgLoad === 0) return 0.5; // 기본값

  const ratio = recentLoad / avgLoad;

  // 🔥 최근 활동량이 평균보다 낮으면 회복 중
  if (ratio < 0.7) {
    return 1.0; // 충분한 회복
  } else if (ratio < 1.0) {
    return 0.8; // 적정 회복
  } else {
    return 0.5; // 회복 부족
  }
}

/**
 * 🔥 리듬 점수 계산 (v1 - 기본)
 * 
 * @param condition 컨디션 데이터
 * @param recentActivityMinutes 최근 3일 활동량 (분)
 * @returns 리듬 점수 (0~1, null = 데이터 없음)
 */
export function calculateRhythmScore(
  condition: DailyCondition | null,
  recentActivityMinutes: number = 0
): RhythmScore {
  // 🔥 데이터가 없으면 null 반환
  if (!condition) {
    return {
      date: "",
      score: null,
      sleepScore: 0,
      fatigueScore: 0,
      painScore: 0,
      loadScore: 0,
    };
  }

  const sleepScore = calculateSleepScore(condition?.sleepHours);
  const fatigueScore = calculateFatigueScore(condition?.fatigue);
  const painScore = calculatePainScore(condition?.pain);
  const loadScore = calculateLoadScore(recentActivityMinutes);

  // 🔥 평균 계산 (가중치: 수면 30%, 피로 30%, 통증 20%, 활동량 20%)
  const score =
    sleepScore * 0.3 + fatigueScore * 0.3 + painScore * 0.2 + loadScore * 0.2;

  return {
    date: condition.date || "",
    score: Math.round(score * 100) / 100, // 소수점 2자리
    sleepScore,
    fatigueScore,
    painScore,
    loadScore,
  };
}

/**
 * 🔥 리듬 점수 계산 (v2 - 훈련량 포함)
 * 
 * @param condition 컨디션 데이터
 * @param trainingLoad 훈련 부하 데이터
 * @returns 리듬 점수 (0~1, null = 데이터 없음)
 */
export function calculateRhythmScoreV2(
  condition: DailyCondition | null,
  trainingLoad: {
    recent3Days: number;
    avg14Days: number;
    loadRatio: number;
  } | null
): RhythmScore {
  // 🔥 데이터가 없으면 null 반환
  if (!condition) {
    return {
      date: "",
      score: null,
      sleepScore: 0,
      fatigueScore: 0,
      painScore: 0,
      loadScore: 0,
    };
  }

  const sleepScore = calculateSleepScore(condition?.sleepHours);
  const fatigueScore = calculateFatigueScore(condition?.fatigue);
  const painScore = calculatePainScore(condition?.pain);

  // 🔥 v2: 훈련 부하 점수 계산
  let loadScore = 0.5; // 기본값
  if (trainingLoad) {
    loadScore = calculateTrainingLoadScore(trainingLoad.loadRatio);
  }

  // 🔥 회복 점수 계산
  let recoveryScore = 0.5; // 기본값
  if (trainingLoad && trainingLoad.avg14Days > 0) {
    recoveryScore = calculateRecoveryScore(
      trainingLoad.recent3Days,
      trainingLoad.avg14Days
    );
  }

  // 🔥 v2 공식: 컨디션 60% + 회복 20% + 훈련부하 20%
  const score =
    (sleepScore * 0.2 + fatigueScore * 0.2 + painScore * 0.2) * 0.6 + // 컨디션 60%
    recoveryScore * 0.2 + // 회복 20%
    loadScore * 0.2; // 훈련부하 20%

  return {
    date: condition.date || "",
    score: Math.round(score * 100) / 100, // 소수점 2자리
    sleepScore,
    fatigueScore,
    painScore,
    loadScore,
  };
}

/**
 * 🔥 리듬 상태 텍스트 반환 (0~100 점수 기준)
 * 
 * @param score 리듬 점수 (0~1 또는 0~100, null 가능)
 * @returns 상태 텍스트
 */
export function getRhythmStatus(score: number | null): {
  text: string;
  color: string;
  description: string;
  badgeColor: string;
} | null {
  if (score === null) return null;

  // 🔥 점수를 0~100으로 정규화
  const score100 = score > 1 ? score : score * 100;

  if (score100 >= 80) {
    return {
      text: "훈련 적기",
      color: "text-green-600",
      description: "최상의 컨디션입니다. 집중 훈련에 적합합니다.",
      badgeColor: "bg-green-100 text-green-700 border-green-200",
    };
  } else if (score100 >= 60) {
    return {
      text: "양호",
      color: "text-blue-600",
      description: "컨디션이 좋습니다. 정상적인 훈련이 가능합니다.",
      badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    };
  } else if (score100 >= 40) {
    return {
      text: "회복 단계",
      color: "text-yellow-600",
      description: "회복이 필요합니다. 가벼운 훈련을 권장합니다.",
      badgeColor: "bg-yellow-100 text-yellow-700 border-yellow-200",
    };
  } else {
    return {
      text: "과부하 위험",
      color: "text-red-600",
      description: "과부하 위험이 있습니다. 휴식이 필요합니다.",
      badgeColor: "bg-red-100 text-red-700 border-red-200",
    };
  }
}

/**
 * 🔥 리듬 추세 계산 (최근 3일 vs 이전 3일)
 * 
 * @param scores 리듬 점수 배열 (최소 6일 필요, null 값 제외)
 * @returns 추세 정보
 */
export function calculateRhythmTrend(scores: RhythmScore[]): {
  trend: "up" | "down" | "stable";
  recentAvg: number;
  previousAvg: number;
  diff: number;
  message: string;
} | null {
  // 🔥 null이 아닌 점수만 필터링
  const validScores = scores.filter((s) => s.score !== null) as Array<
    Omit<RhythmScore, "score"> & { score: number }
  >;

  if (validScores.length < 6) {
    return null;
  }

  // 🔥 최근 3일 평균
  const recent3 = validScores.slice(-3);
  const recentAvg =
    recent3.reduce((sum, s) => sum + s.score, 0) / recent3.length;

  // 🔥 이전 3일 평균
  const previous3 = validScores.slice(-6, -3);
  const previousAvg =
    previous3.reduce((sum, s) => sum + s.score, 0) / previous3.length;

  const diff = recentAvg - previousAvg;
  const diffPercent = previousAvg > 0 ? (diff / previousAvg) * 100 : 0;

  let trend: "up" | "down" | "stable" = "stable";
  let message = "변화 없음";

  if (Math.abs(diffPercent) < 5) {
    // 5% 미만 변화는 stable
    trend = "stable";
    message = "안정적";
  } else if (diff > 0) {
    trend = "up";
    message = `+${diffPercent.toFixed(0)}% 상승`;
  } else {
    trend = "down";
    message = `${diffPercent.toFixed(0)}% 하락`;
  }

  return {
    trend,
    recentAvg,
    previousAvg,
    diff,
    message,
  };
}
