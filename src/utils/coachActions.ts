/**
 * 🔥 coachActions - 코치 액션 추천 유틸
 * 
 * 역할:
 * - 리듬 상태 + 훈련 부하 기반 행동 제안
 * - 선수 행동 유도 UX
 * 
 * UX 목적:
 * - 상태 설명 → 행동 제안
 * - 코칭 시스템 완성
 */

import type { RhythmScore } from "./rhythmCalculator";
import type { TrainingLoad } from "@/hooks/useTrainingLoad";

/**
 * 🔥 코치 액션 타입
 */
export interface CoachAction {
  type: "recovery" | "training" | "rest" | "maintenance" | "intensity";
  title: string;
  message: string;
  icon: string;
  color: string;
  bgColor: string;
  actions: string[]; // 구체적 행동 목록
}

/**
 * 🔥 코치 액션 생성
 * 
 * @param rhythmScore 오늘 리듬 점수
 * @param trainingLoad 훈련 부하 데이터
 * @returns 코치 액션 추천
 */
export function getCoachAction(
  rhythmScore: RhythmScore | null,
  trainingLoad: TrainingLoad | null
): CoachAction | null {
  if (!rhythmScore || rhythmScore.score === null) {
    return null;
  }

  const score = rhythmScore.score * 100; // 0~100으로 변환
  const loadStatus = trainingLoad?.status || "normal";

  // 🔥 우선순위 1: 과부하 위험 (부상 방지 최우선)
  if (loadStatus === "danger") {
    return {
      type: "rest",
      title: "즉시 휴식 필요",
      message: "최근 훈련량이 평균 대비 160% 이상입니다. 부상 위험이 높습니다.",
      icon: "⚠️",
      color: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
      actions: [
        "오늘은 완전 휴식",
        "가벼운 스트레칭만 권장",
        "수면 8시간 이상",
        "영양 보충 필수",
      ],
    };
  }

  if (loadStatus === "high") {
    return {
      type: "recovery",
      title: "회복 훈련 추천",
      message: "최근 훈련량이 평균 대비 120% 이상입니다. 회복이 필요합니다.",
      icon: "🔄",
      color: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
      actions: [
        "가벼운 유산소 운동 (30분 이하)",
        "동적 스트레칭",
        "폼 롤링",
        "충분한 수면",
      ],
    };
  }

  // 🔥 우선순위 2: 리듬 점수 기반 추천
  if (score >= 80) {
    // 훈련 적기
    if (loadStatus === "low") {
      return {
        type: "intensity",
        title: "강도 높은 훈련 적기",
        message: "컨디션이 최상입니다. 집중 훈련에 최적의 시기입니다.",
        icon: "🔥",
        color: "text-green-700",
        bgColor: "bg-green-50 border-green-200",
        actions: [
          "고강도 인터벌 훈련",
          "기술 연습 집중",
          "경기 시뮬레이션",
          "체력 훈련 강화",
        ],
      };
    } else {
      return {
        type: "training",
        title: "정상 훈련 가능",
        message: "컨디션이 좋습니다. 계획된 훈련을 진행하세요.",
        icon: "✅",
        color: "text-blue-700",
        bgColor: "bg-blue-50 border-blue-200",
        actions: [
          "정상 강도 훈련",
          "기술 연습",
          "팀 연습 참여",
          "운동 후 스트레칭",
        ],
      };
    }
  } else if (score >= 60) {
    // 양호
    return {
      type: "maintenance",
      title: "유지 훈련 추천",
      message: "컨디션이 양호합니다. 무리하지 않는 선에서 훈련하세요.",
      icon: "👍",
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      actions: [
        "중간 강도 훈련",
        "기술 연습",
        "팀 연습 참여",
        "충분한 워밍업",
      ],
    };
  } else if (score >= 40) {
    // 회복 단계
    return {
      type: "recovery",
      title: "회복 훈련 추천",
      message: "회복이 필요합니다. 가벼운 훈련으로 전환하세요.",
      icon: "🔄",
      color: "text-yellow-700",
      bgColor: "bg-yellow-50 border-yellow-200",
      actions: [
        "가벼운 유산소 운동",
        "동적 스트레칭",
        "폼 롤링",
        "수면 8시간 이상",
      ],
    };
  } else {
    // 과부하 위험
    return {
      type: "rest",
      title: "휴식 권장",
      message: "과부하 위험이 있습니다. 휴식이 필요합니다.",
      icon: "😴",
      color: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
      actions: [
        "오늘은 휴식",
        "가벼운 스트레칭만",
        "수면 8시간 이상",
        "영양 보충",
      ],
    };
  }
}
