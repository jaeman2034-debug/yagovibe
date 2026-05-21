/**
 * 🔥 자기 교정 레이어 (천재 모드 2.3)
 * 
 * 역할:
 * - 신뢰 점수 계산
 * - 의심 로직 (신뢰도가 낮을 때)
 * - 문장 통합
 */

import type { LongMemory } from "./longMemory";
import type { MapPlace } from "@/types/map";
import type { SportsSenseProfile } from "./sportsSenseRecommendation";

export interface ConfidenceContext {
  courseLength: number;
  memory: LongMemory | null;
  profile: SportsSenseProfile;
  hasRecentFeedback: boolean; // 최근 피드백이 있는지
  behaviorScoreCount: number; // 행동 점수 데이터 개수
}

/**
 * 🔥 신뢰 점수 계산
 */
export function calculateConfidence(ctx: ConfidenceContext): number {
  let confidence = 0.5; // 기본 신뢰도 50%

  // 🔥 v2.3: 기억 데이터가 충분할 때 신뢰도 증가
  if (ctx.memory) {
    // favoriteTags가 많을수록 신뢰도 증가
    if (ctx.memory.favoriteTags.length > 3) {
      confidence += 0.2;
    } else if (ctx.memory.favoriteTags.length > 0) {
      confidence += 0.1;
    }

    // favoriteCategories가 있을 때 신뢰도 증가
    if (ctx.memory.favoriteCategories.length > 0) {
      confidence += 0.1;
    }

    // bestTime이 있을 때 신뢰도 증가
    if (ctx.memory.bestTime.length > 0) {
      confidence += 0.1;
    }

    // liked/hated 리스트가 있을 때 신뢰도 증가 (명확한 선호도)
    if (ctx.memory.liked && ctx.memory.liked.length > 0) {
      confidence += 0.1;
    }
    if (ctx.memory.hated && ctx.memory.hated.length > 0) {
      confidence += 0.1;
    }
  }

  // 🔥 v2.3: 코스 길이가 적절할 때 신뢰도 증가
  if (ctx.courseLength >= 3) {
    confidence += 0.1;
  } else if (ctx.courseLength >= 2) {
    confidence += 0.05;
  }

  // 🔥 v2.3: 최근 피드백이 있을 때 신뢰도 증가 (학습 중)
  if (ctx.hasRecentFeedback) {
    confidence += 0.1;
  }

  // 🔥 v2.3: 행동 점수 데이터가 많을수록 신뢰도 증가
  if (ctx.behaviorScoreCount > 10) {
    confidence += 0.1;
  } else if (ctx.behaviorScoreCount > 5) {
    confidence += 0.05;
  }

  // 🔥 신뢰도는 0.95를 넘지 않음 (완벽하지 않다는 인정)
  return Math.min(confidence, 0.95);
}

/**
 * 🔥 의심 로직 (신뢰도가 낮을 때)
 */
export function generateDoubt(confidence: number): string {
  if (confidence < 0.4) {
    return "아직 학습 중이에요. 더 알려주시면 더 잘 맞춰드릴게요 🙏";
  }

  if (confidence < 0.6) {
    return "확신은 약하지만 시도해볼 만해요";
  }

  if (confidence < 0.8) {
    return "괜찮은 선택일 거예요";
  }

  // 🔥 신뢰도가 높으면 의심 표현 없음
  return "";
}

/**
 * 🔥 신뢰도 기반 문장 통합
 */
export function integrateConfidence(
  baseSentence: string,
  confidence: number,
  doubtMessage?: string
): string {
  if (!doubtMessage || doubtMessage === "") {
    return baseSentence;
  }

  // 🔥 의심 메시지를 문장 끝에 추가
  return `${baseSentence}\n\n${doubtMessage}`;
}

/**
 * 🔥 신뢰도 레벨 분류
 */
export type ConfidenceLevel = "low" | "medium" | "high" | "very-high";

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence < 0.4) {
    return "low";
  }
  if (confidence < 0.6) {
    return "medium";
  }
  if (confidence < 0.8) {
    return "high";
  }
  return "very-high";
}

/**
 * 🔥 신뢰도 레벨별 문구
 */
export function getConfidenceLabel(level: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    low: "학습 중",
    medium: "추천 중",
    high: "확신",
    "very-high": "강력 추천",
  };

  return labels[level] || "추천 중";
}
