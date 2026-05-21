/**
 * 🔥 AI 훈련 추천 서비스
 * 
 * 역할:
 * - 리듬 기반 훈련 메뉴 제안
 * - 회복 루틴 추천
 * - 개인 맞춤 성장 로드맵
 * 
 * UX 목적:
 * - 제품 포지셔닝 강화
 * - 사용자 몰입도 상승
 */

import type { RhythmScore } from "@/utils/rhythmCalculator";
import type { TrainingLoad } from "@/hooks/useTrainingLoad";
import type { DailyCondition } from "@/services/growthService";

/**
 * 🔥 훈련 타입
 */
export type TrainingType =
  | "high_intensity" // 고강도 훈련
  | "moderate_intensity" // 중강도 훈련
  | "low_intensity" // 저강도 훈련
  | "recovery" // 회복 훈련
  | "rest"; // 휴식

/**
 * 🔥 훈련 카테고리
 */
export type TrainingCategory =
  | "cardio" // 유산소
  | "strength" // 근력
  | "flexibility" // 유연성
  | "skill" // 기술
  | "mental"; // 멘탈

/**
 * 🔥 AI 훈련 추천
 */
export interface TrainingRecommendation {
  type: TrainingType;
  category: TrainingCategory;
  title: string;
  description: string;
  duration: number; // 분 단위
  intensity: number; // 1~10
  reason: string; // 추천 이유
  exercises?: string[]; // 추천 운동 목록
  tips?: string[]; // 팁 목록
  icon: string;
  color: string;
  bgColor: string;
}

/**
 * 🔥 AI 추천 컨텍스트
 */
export interface RecommendationContext {
  rhythmScore: RhythmScore | null;
  trainingLoad: TrainingLoad | null;
  condition: DailyCondition | null;
  recentActivityCount: number; // 최근 7일 활동 횟수
}

/**
 * 🔥 고강도 훈련 추천 생성
 */
function createHighIntensityRecommendation(
  context: RecommendationContext
): TrainingRecommendation {
  const category: TrainingCategory = "cardio";
  const exercises = [
    "인터벌 러닝 (30초 고강도 + 1분 회복) × 8세트",
    "버피 테스트 5세트",
    "스프린트 100m × 5회",
  ];

  return {
    type: "high_intensity",
    category,
    title: "고강도 인터벌 훈련",
    description: "컨디션이 최상입니다. 체력과 스피드를 극대화할 수 있는 시기입니다.",
    duration: 45,
    intensity: 9,
    reason: "리듬 점수가 높고 훈련 부하가 적절합니다. 고강도 훈련으로 성능을 끌어올리세요.",
    exercises,
    tips: [
      "충분한 워밍업 필수 (10분 이상)",
      "세트 간 휴식 2~3분",
      "운동 후 스트레칭 10분",
    ],
    icon: "🔥",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
  };
}

/**
 * 🔥 중강도 훈련 추천 생성
 */
function createModerateIntensityRecommendation(
  context: RecommendationContext
): TrainingRecommendation {
  const category: TrainingCategory = "strength";
  const exercises = [
    "근력 훈련 (상체/하체 분할)",
    "기술 연습 (드리블, 패스)",
    "유산소 운동 (30분)",
  ];

  return {
    type: "moderate_intensity",
    category,
    title: "균형 잡힌 훈련",
    description: "컨디션이 양호합니다. 전반적인 체력과 기술을 향상시킬 수 있습니다.",
    duration: 60,
    intensity: 6,
    reason: "리듬 점수가 안정적이고 훈련 부하가 정상 범위입니다.",
    exercises,
    tips: [
      "기술 연습에 집중",
      "근력과 유산소 균형 유지",
      "적절한 휴식 시간 확보",
    ],
    icon: "💪",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  };
}

/**
 * 🔥 저강도 훈련 추천 생성
 */
function createLowIntensityRecommendation(
  context: RecommendationContext
): TrainingRecommendation {
  const category: TrainingCategory = "flexibility";
  const exercises = [
    "가벼운 조깅 (20분)",
    "스트레칭 (15분)",
    "기술 연습 (저강도)",
  ];

  return {
    type: "low_intensity",
    category,
    title: "가벼운 활성 회복",
    description: "컨디션이 회복 중입니다. 가벼운 운동으로 몸을 풀어주세요.",
    duration: 35,
    intensity: 3,
    reason: "리듬 점수가 낮거나 회복이 필요한 상태입니다.",
    exercises,
    tips: [
      "무리하지 말고 천천히",
      "스트레칭에 집중",
      "충분한 수면 확보",
    ],
    icon: "🌱",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  };
}

/**
 * 🔥 회복 훈련 추천 생성
 */
function createRecoveryRecommendation(
  context: RecommendationContext
): TrainingRecommendation {
  const category: TrainingCategory = "flexibility";
  const exercises = [
    "요가 또는 필라테스 (30분)",
    "가벼운 스트레칭 (20분)",
    "명상 또는 호흡 운동 (10분)",
  ];

  return {
    type: "recovery",
    category,
    title: "회복 훈련",
    description: "과부하 상태입니다. 회복에 집중하여 부상 위험을 줄이세요.",
    duration: 40,
    intensity: 2,
    reason: "훈련 부하가 높아 회복이 필요합니다. 무리한 훈련은 부상 위험이 있습니다.",
    exercises,
    tips: [
      "고강도 운동 금지",
      "수면 8시간 이상",
      "영양 보충 (단백질, 비타민)",
      "마사지 또는 스트레칭",
    ],
    icon: "🧘",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
  };
}

/**
 * 🔥 휴식 추천 생성
 */
function createRestRecommendation(
  context: RecommendationContext
): TrainingRecommendation {
  return {
    type: "rest",
    category: "mental",
    title: "완전 휴식",
    description: "컨디션이 매우 낮습니다. 오늘은 휴식이 최선입니다.",
    duration: 0,
    intensity: 0,
    reason: "리듬 점수가 매우 낮거나 통증이 있는 상태입니다. 강제 훈련은 부상 위험이 있습니다.",
    exercises: [],
    tips: [
      "운동 금지",
      "충분한 수면 (9시간 이상)",
      "영양 보충",
      "가벼운 산책만 가능",
      "내일 컨디션 재확인",
    ],
    icon: "😴",
    color: "text-gray-700",
    bgColor: "bg-gray-50 border-gray-200",
  };
}

/**
 * 🔥 AI 문장 생성 (템플릿 기반)
 * 
 * @param type 훈련 타입
 * @param context 추천 컨텍스트
 * @returns AI 생성 문장
 */
function generateAIMessage(
  type: TrainingType,
  context: RecommendationContext
): string {
  const { rhythmScore, trainingLoad, condition, recentActivityCount } = context;
  const score = rhythmScore?.score;
  const score100 = score !== null ? (score > 1 ? score : score * 100) : null;
  const loadRatio = trainingLoad?.loadRatio || 0;

  // 🔥 템플릿 기반 문장 생성
  const templates: Record<TrainingType, string[]> = {
    high_intensity: [
      "오늘은 고강도 슈팅 훈련이 적합합니다. 컨디션이 최상이니 집중 훈련으로 성능을 끌어올리세요.",
      "컨디션이 최상입니다. 인터벌 훈련으로 체력과 스피드를 극대화할 수 있는 시기입니다.",
      "리듬 점수가 높습니다. 오늘은 고강도 훈련으로 한 단계 성장할 수 있습니다.",
    ],
    moderate_intensity: [
      "오늘은 균형 잡힌 훈련이 적합합니다. 기술과 체력을 함께 향상시키세요.",
      "컨디션이 양호합니다. 계획대로 훈련을 진행하시면 됩니다.",
      "안정적인 컨디션입니다. 기술 연습과 근력 훈련을 병행하세요.",
    ],
    low_intensity: [
      "회복 단계입니다. 기술 훈련과 스트레칭을 권장합니다.",
      "컨디션이 회복 중입니다. 가벼운 운동으로 몸을 풀어주세요.",
      "오늘은 저강도 활성 회복이 적합합니다. 무리하지 말고 천천히 진행하세요.",
    ],
    recovery: [
      "최근 부하가 높습니다. 휴식을 우선하세요.",
      "과부하 상태입니다. 회복 훈련으로 부상 위험을 줄이세요.",
      "회복이 필요합니다. 오늘은 요가나 스트레칭으로 몸을 풀어주세요.",
    ],
    rest: [
      "컨디션이 매우 낮습니다. 오늘은 완전 휴식이 최선입니다.",
      "통증이 있는 상태입니다. 강제 훈련은 부상 위험이 있습니다.",
      "회복이 우선입니다. 내일 컨디션을 다시 확인하세요.",
    ],
  };

  const messages = templates[type];
  if (!messages || messages.length === 0) {
    return "오늘의 훈련을 추천합니다.";
  }

  // 🔥 컨텍스트 기반 메시지 선택
  let selectedMessage = messages[0];

  if (type === "high_intensity" && score100 && score100 >= 85) {
    selectedMessage = messages[1];
  } else if (type === "recovery" && loadRatio > 1.5) {
    selectedMessage = messages[0];
  } else if (type === "rest" && condition?.pain && condition.pain >= 8) {
    selectedMessage = messages[1];
  }

  return selectedMessage;
}

/**
 * 🔥 AI 훈련 추천 생성 (핵심 로직)
 * 
 * @param context 추천 컨텍스트
 * @returns 훈련 추천
 */
export function generateTrainingRecommendation(
  context: RecommendationContext
): TrainingRecommendation | null {
  const { rhythmScore, trainingLoad, condition } = context;

  // 🔥 데이터 없으면 추천 불가
  if (!rhythmScore || !trainingLoad) {
    return null;
  }

  const score = rhythmScore.score;
  const loadRatio = trainingLoad.loadRatio;
  const pain = condition?.pain || 0;

  // 🔥 1) 통증이 높으면 휴식
  if (pain >= 7) {
    const recommendation = createRestRecommendation(context);
    recommendation.reason = generateAIMessage("rest", context);
    return recommendation;
  }

  // 🔥 2) 과부하 상태면 회복 훈련
  if (loadRatio > 1.2) {
    const recommendation = createRecoveryRecommendation(context);
    recommendation.reason = generateAIMessage("recovery", context);
    return recommendation;
  }

  // 🔥 3) 리듬 점수 기반 추천
  if (score === null) {
    const recommendation = createLowIntensityRecommendation(context);
    recommendation.reason = generateAIMessage("low_intensity", context);
    return recommendation;
  }

  // 🔥 점수를 0~100으로 정규화
  const score100 = score > 1 ? score : score * 100;

  let recommendation: TrainingRecommendation;

  if (score100 >= 80 && loadRatio >= 0.7 && loadRatio <= 1.2) {
    // 🔥 컨디션 최상 + 부하 정상 → 고강도
    recommendation = createHighIntensityRecommendation(context);
    recommendation.reason = generateAIMessage("high_intensity", context);
  } else if (score100 >= 60 && loadRatio <= 1.0) {
    // 🔥 컨디션 양호 + 부하 낮음 → 중강도
    recommendation = createModerateIntensityRecommendation(context);
    recommendation.reason = generateAIMessage("moderate_intensity", context);
  } else if (score100 >= 40) {
    // 🔥 컨디션 회복 중 → 저강도
    recommendation = createLowIntensityRecommendation(context);
    recommendation.reason = generateAIMessage("low_intensity", context);
  } else {
    // 🔥 컨디션 매우 낮음 → 회복 또는 휴식
    if (loadRatio > 1.0) {
      recommendation = createRecoveryRecommendation(context);
      recommendation.reason = generateAIMessage("recovery", context);
    } else {
      recommendation = createRestRecommendation(context);
      recommendation.reason = generateAIMessage("rest", context);
    }
  }

  return recommendation;
}

/**
 * 🔥 주간 훈련 로드맵 생성
 * 
 * @param context 추천 컨텍스트
 * @param days 일수 (기본 7일)
 * @returns 주간 훈련 로드맵
 */
export function generateWeeklyTrainingRoadmap(
  context: RecommendationContext,
  days: number = 7
): TrainingRecommendation[] {
  const roadmap: TrainingRecommendation[] = [];

  // 🔥 간단한 로직: 오늘 추천 + 다음 6일 예측
  const todayRecommendation = generateTrainingRecommendation(context);
  if (todayRecommendation) {
    roadmap.push(todayRecommendation);
  }

  // 🔥 나머지 일수는 오늘 추천 기반으로 생성
  for (let i = 1; i < days; i++) {
    // 🔥 간단한 패턴: 고강도 → 중강도 → 저강도 → 회복 순환
    const patternIndex = i % 4;
    let recommendation: TrainingRecommendation;

    switch (patternIndex) {
      case 0:
        recommendation = createModerateIntensityRecommendation(context);
        break;
      case 1:
        recommendation = createLowIntensityRecommendation(context);
        break;
      case 2:
        recommendation = createRecoveryRecommendation(context);
        break;
      default:
        recommendation = createModerateIntensityRecommendation(context);
    }

    roadmap.push(recommendation);
  }

  return roadmap;
}
