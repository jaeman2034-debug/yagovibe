/**
 * 🔥 성장 규칙 레이어 (천재 모드 2.5)
 * 
 * 역할:
 * - 사용자가 많이 쓸수록 성격이 달라지게
 * - 기억 기반 성격 진화
 * - 학습 가중치 조정
 */

import type { LongMemory } from "./longMemory";
import type { Tone } from "./toneEngine";

/**
 * 🔥 성격 진화
 */
export function evolvePersona(memory: LongMemory | null): Tone {
  if (!memory) {
    return "casual"; // 기본값: 캐주얼
  }

  // 🔥 v2.5: 펍 선호 → 친구톤
  if (memory.favoriteTags.includes("pub") || memory.favoriteTags.includes("펍")) {
    return "friend";
  }

  // 🔥 v2.5: 시끄러운 곳 회피 → 공손톤
  if (memory.avoided.includes("noisy") || memory.avoided.includes("시끄러운")) {
    return "polite";
  }

  // 🔥 v2.5: 조용한 곳 선호 → 공손톤
  if (memory.favoriteTags.includes("quiet") || memory.favoriteTags.includes("조용한")) {
    return "polite";
  }

  // 🔥 v2.5: 좋아요한 장소가 많으면 친구톤
  if (memory.liked && memory.liked.length > 5) {
    return "friend";
  }

  // 🔥 v2.5: 싫어요한 장소가 많으면 공손톤 (신중하게)
  if (memory.hated && memory.hated.length > 3) {
    return "polite";
  }

  // 🔥 v2.5: favoriteTags가 많으면 친구톤 (많이 학습함)
  if (memory.favoriteTags.length > 5) {
    return "friend";
  }

  // 🔥 v2.5: favoriteTags가 적으면 캐주얼 (아직 학습 중)
  if (memory.favoriteTags.length < 2) {
    return "casual";
  }

  // 🔥 기본값: 캐주얼
  return "casual";
}

/**
 * 🔥 성격 진화 기반 톤 선택
 */
export function selectEvolvedTone(
  memory: LongMemory | null,
  timeOfDay?: "morning" | "day" | "evening" | "night",
  weather?: "rain" | "hot" | "cold" | "clear"
): Tone {
  // 🔥 v2.5: 기억 기반 성격 진화 우선
  const evolvedPersona = evolvePersona(memory);

  // 🔥 v2.5: 상황 기반 톤 조정 (기억이 부족할 때만)
  if (!memory || memory.favoriteTags.length < 2) {
    // 기억이 부족하면 상황 기반 톤 사용
    if (timeOfDay === "evening" || timeOfDay === "night") {
      return "friend";
    }
    if (weather === "rain" || weather === "cold") {
      return "polite";
    }
  }

  return evolvedPersona;
}

/**
 * 🔥 학습 가중치 조정
 */
export function adaptiveWeight(
  baseWeight: number,
  memory: LongMemory | null
): number {
  if (!memory) {
    return baseWeight; // 기억이 없으면 기본 가중치
  }

  // 🔥 v2.5: favoriteTags가 많을수록 가중치 증가
  const tagBonus = memory.favoriteTags.length * 0.05;
  
  // 🔥 v2.5: liked/hated 리스트가 있으면 가중치 증가 (명확한 선호도)
  const preferenceBonus = 
    ((memory.liked && memory.liked.length > 0) ? 0.1 : 0) +
    ((memory.hated && memory.hated.length > 0) ? 0.1 : 0);

  // 🔥 v2.5: bestTime이 있으면 가중치 증가 (시간 패턴 학습)
  const timeBonus = memory.bestTime.length > 0 ? 0.05 : 0;

  // 🔥 최종 가중치 계산
  const finalWeight = baseWeight * (1 + tagBonus + preferenceBonus + timeBonus);

  // 🔥 가중치 상한선 (너무 높아지지 않도록)
  return Math.min(finalWeight, baseWeight * 2.0);
}

/**
 * 🔥 성격 진화 단계 계산
 */
export type PersonaStage = "newborn" | "learning" | "familiar" | "intimate";

export function getPersonaStage(memory: LongMemory | null): PersonaStage {
  if (!memory) {
    return "newborn"; // 기억이 없으면 신생
  }

  const tagCount = memory.favoriteTags.length;
  const likedCount = memory.liked?.length || 0;
  const hatedCount = memory.hated?.length || 0;
  const totalInteractions = tagCount + likedCount + hatedCount;

  if (totalInteractions < 3) {
    return "newborn"; // 신생: 아직 학습 시작 전
  }

  if (totalInteractions < 10) {
    return "learning"; // 학습 중: 패턴 파악 중
  }

  if (totalInteractions < 20) {
    return "familiar"; // 친숙: 어느 정도 알게 됨
  }

  return "intimate"; // 친밀: 많이 알고 있음
}

/**
 * 🔥 성격 진화 단계별 설명
 */
export function getPersonaStageDescription(stage: PersonaStage): string {
  const descriptions: Record<PersonaStage, string> = {
    newborn: "처음 만났어요 👋",
    learning: "배우는 중이에요 📚",
    familiar: "이제 좀 알겠어요 😊",
    intimate: "잘 알고 있어요 ✨",
  };

  return descriptions[stage] || "처음 만났어요 👋";
}
