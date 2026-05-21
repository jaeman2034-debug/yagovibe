/**
 * 🔥 톤 엔진 (천재 모드 1.6 - 인격 레이어)
 * 
 * 역할:
 * - 문장 톤 선택 (casual, polite, friend)
 * - 상황별 톤 자동 선택
 * - 자연스러운 대화형 느낌
 * - 인격 있는 말투 프로필
 */

import type { LongMemory } from "./longMemory";
import { selectEvolvedTone } from "./personaEvolution";

export type Tone = "casual" | "polite" | "friend";

/**
 * 🔥 v1.6: 말투 프로필 (인격 레이어)
 */
export const persona: Record<Tone, { prefix: string; suffix: string }> = {
  casual: {
    prefix: "이 루트 괜찮은데요?",
    suffix: "가보면 만족할 거예요",
  },
  polite: {
    prefix: "추천드리는 코스입니다",
    suffix: "즐거운 시간 되세요",
  },
  friend: {
    prefix: "이렇게 가면 딱",
    suffix: "믿어봐요 👍",
  },
};

/**
 * 🔥 v1.6: 대화형 문장 생성
 */
export function talkSentence(
  courseNames: string[],
  tone: Tone = "casual"
): string {
  if (courseNames.length === 0) {
    return "";
  }

  const p = persona[tone];
  const courseList = courseNames
    .map((name, i) => `${i + 1}) ${name}`)
    .join("\n");

  return `${p.prefix}\n${courseList}\n${p.suffix}`;
}

/**
 * 🔥 v1.5: 톤별 문장 생성 (기존 호환성 유지)
 */
export function toneSentence(
  courseNames: string[],
  tone: Tone = "casual"
): string {
  // 🔥 v1.6: 대화형 문장 사용
  return talkSentence(courseNames, tone);
}

/**
 * 🔥 상황별 톤 자동 선택
 */
export function chooseTone(
  context?: { 
    timeOfDay?: "morning" | "day" | "evening" | "night"; 
    weather?: "rain" | "hot" | "cold" | "clear";
    memory?: LongMemory | null; // 🔥 v2.5: 성격 진화를 위한 기억
  }
): Tone {
  // 🔥 v2.5: 성격 진화 우선 (기억이 있으면)
  if (context?.memory) {
    return selectEvolvedTone(context.memory, context.timeOfDay, context.weather);
  }

  // 🔥 저녁/밤 → 친구톤 (기억이 없을 때만)
  if (context?.timeOfDay === "evening" || context?.timeOfDay === "night") {
    return "friend";
  }

  // 🔥 비/추위 → 공손한 톤 (기억이 없을 때만)
  if (context?.weather === "rain" || context?.weather === "cold") {
    return "polite";
  }

  // 🔥 기본 → 캐주얼
  return "casual";
}
