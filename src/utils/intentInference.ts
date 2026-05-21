/**
 * 🔥 의도 추론기 (천재 모드 2.2)
 * 
 * 역할:
 * - 사용자가 말 안 해도 의도를 추측
 * - 상황(context)과 기억(memory) 기반 추론
 * - 자동 프로필 업데이트
 */

import type { LongMemory } from "./longMemory";
import type { SportsSenseProfile } from "./sportsSenseRecommendation";

export type InferredIntent = "watch" | "exercise" | "play" | "alone";

export interface InferenceContext {
  time?: "morning" | "day" | "evening" | "night";
  hour?: number;
  steps?: number; // 걸음 수 (운동 의도 추론용)
  location?: "home" | "gym" | "stadium" | "park" | "cafe" | "pub" | "other";
  weather?: "rain" | "hot" | "cold" | "clear";
  dayOfWeek?: number; // 0 = 일요일, 6 = 토요일
}

/**
 * 🔥 의도 추론
 */
export function inferIntent(
  context: InferenceContext,
  memory: LongMemory | null,
  currentIntent?: InferredIntent
): InferredIntent {
  // 🔥 v2.2: 시간대 기반 추론
  const hour = context.hour ?? new Date().getHours();
  const timeOfDay: "morning" | "day" | "evening" | "night" = 
    hour < 10 ? "morning" :
    hour < 17 ? "day" :
    hour < 22 ? "evening" : "night";

  // 🔥 v2.2: 저녁 + 펍 선호 → 경기 관람 의도
  if (timeOfDay === "evening" && memory?.favoriteTags.includes("pub")) {
    return "watch";
  }

  // 🔥 v2.2: 걸음 수 기반 추론 (운동 중)
  if (context.steps && context.steps > 2000) {
    return "exercise";
  }

  // 🔥 v2.2: 위치 기반 추론
  if (context.location === "gym" || context.location === "park") {
    return "exercise";
  }

  if (context.location === "stadium") {
    return "watch";
  }

  if (context.location === "cafe") {
    return "play"; // 휴식
  }

  // 🔥 v2.2: 기억 기반 추론 (선호 시간대)
  if (memory?.bestTime.length > 0) {
    const currentHour = hour;
    const isPreferredTime = memory.bestTime.some(preferredHour => {
      // ±1시간 범위 내면 선호 시간대로 간주
      return Math.abs(currentHour - preferredHour) <= 1;
    });

    if (isPreferredTime) {
      // 선호 시간대에 자주 찾는 태그 기반 추론
      if (memory.favoriteTags.includes("pub") || memory.favoriteTags.includes("stadium")) {
        return "watch";
      }
      if (memory.favoriteTags.includes("gym") || memory.favoriteTags.includes("park")) {
        return "exercise";
      }
      if (memory.favoriteTags.includes("cafe")) {
        return "play";
      }
    }
  }

  // 🔥 v2.2: 요일 기반 추론 (주말 → 운동/관람, 평일 → 휴식)
  if (context.dayOfWeek !== undefined) {
    const isWeekend = context.dayOfWeek === 0 || context.dayOfWeek === 6;
    if (isWeekend && timeOfDay === "day") {
      return "exercise"; // 주말 낮 → 운동
    }
    if (isWeekend && timeOfDay === "evening") {
      return "watch"; // 주말 저녁 → 경기 관람
    }
    if (!isWeekend && timeOfDay === "evening") {
      return "play"; // 평일 저녁 → 휴식
    }
  }

  // 🔥 v2.2: 날씨 기반 추론
  if (context.weather === "rain") {
    return "play"; // 비 오면 실내 휴식
  }

  if (context.weather === "clear" && timeOfDay === "day") {
    return "exercise"; // 맑은 낮 → 운동
  }

  // 🔥 기본값: 현재 의도 유지 또는 휴식
  return currentIntent || "play";
}

/**
 * 🔥 의도 기반 문장 생성
 */
export function intentSentence(
  courseNames: string[],
  intent: InferredIntent
): string {
  if (courseNames.length === 0) {
    return "";
  }

  const courseList = courseNames
    .map((name, i) => `${i + 1}) ${name}`)
    .join("\n");

  const intentMessages: Record<InferredIntent, string> = {
    play: "쉬는 날 무드 ✨",
    exercise: "몸 쓰기 좋은 루트예요 ✨",
    watch: "경기 보기 전에 딱 ✨",
    alone: "혼자만의 시간 ✨",
  };

  const message = intentMessages[intent] || "오늘 코스 ✨";

  return `${message}\n${courseList}`;
}

/**
 * 🔥 의도 추론 기반 프로필 업데이트
 */
export function updateProfileWithInference(
  profile: SportsSenseProfile,
  context: InferenceContext,
  memory: LongMemory | null
): SportsSenseProfile {
  const inferredIntent = inferIntent(context, memory, profile.todayIntent as InferredIntent);

  // 🔥 의도가 변경되었을 때만 업데이트
  if (inferredIntent !== profile.todayIntent) {
    console.log(`🧠 [intentInference] 의도 추론: ${profile.todayIntent} → ${inferredIntent}`);
    
    return {
      ...profile,
      todayIntent: inferredIntent as "watch" | "exercise" | "play" | "alone",
    };
  }

  return profile;
}
