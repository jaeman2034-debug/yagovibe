/**
 * 🔥 상황 인식 레이어 (천재 모드 1.4)
 * 
 * 역할:
 * - 시간대 인식 (morning/day/evening/night)
 * - 위치 반경 계산
 * - 날씨 보너스 (향후 확장)
 * - 상황별 문장 생성
 */

export type TimeOfDay = "morning" | "day" | "evening" | "night";

/**
 * 🔥 시간대 인식
 */
export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();

  if (hour < 10) return "morning";
  if (hour < 17) return "day";
  if (hour < 22) return "evening";
  return "night";
}

/**
 * 🔥 시간대별 텍스트
 */
export function getTimeText(timeOfDay?: TimeOfDay): string {
  const t = timeOfDay || getTimeOfDay();
  
  const timeTextMap: Record<TimeOfDay, string> = {
    morning: "아침",
    day: "오늘",
    evening: "퇴근 후",
    night: "밤",
  };

  return timeTextMap[t] || "오늘";
}

/**
 * 🔥 시간대별 문구
 */
export function getTimePhrase(timeOfDay?: TimeOfDay): string {
  const t = timeOfDay || getTimeOfDay();
  
  const phraseMap: Record<TimeOfDay, string> = {
    morning: "아침에",
    day: "오늘",
    evening: "퇴근 후",
    night: "밤에",
  };

  return phraseMap[t] || "오늘";
}

/**
 * 🔥 거리 페널티 계산
 */
export function calculateDistancePenalty(
  distance: number, // 미터 단위
  maxPenalty: number = 5
): number {
  // 거리를 km로 변환하고 최대 페널티 제한
  const distanceKm = distance / 1000;
  return Math.min(distanceKm, maxPenalty) * 0.8;
}

/**
 * 🔥 시간대별 추천 가중치
 */
export function getTimeBonusWeight(
  placeCategory: string,
  timeOfDay: TimeOfDay
): number {
  // 🔥 시간대별 카테고리 선호도
  const timePreferences: Record<TimeOfDay, Record<string, number>> = {
    morning: {
      cafe: 1.3,
      restaurant: 1.1,
      park: 1.2,
      gym: 1.0,
      pub: 0.7,
      stadium: 0.8,
    },
    day: {
      cafe: 1.1,
      restaurant: 1.0,
      park: 1.1,
      gym: 1.2,
      pub: 0.9,
      stadium: 1.0,
    },
    evening: {
      cafe: 1.0,
      restaurant: 1.3,
      pub: 1.4,
      park: 0.9,
      gym: 0.8,
      stadium: 1.2,
    },
    night: {
      pub: 1.5,
      restaurant: 1.2,
      cafe: 0.8,
      park: 0.7,
      gym: 0.6,
      stadium: 1.1,
    },
  };

  const preferences = timePreferences[timeOfDay];
  return preferences[placeCategory] || 1.0;
}

/**
 * 🔥 v1.4: 상황별 문장 생성 (강화 버전)
 */
export function makeSmartSentence(
  courseNames: string[],
  timeOfDay?: TimeOfDay
): string {
  const t = timeOfDay || getTimeOfDay();
  
  if (courseNames.length === 0) {
    return "";
  }

  // 🔥 v1.4: 시간대별 prefix
  const prefix =
    t === "morning" ? "아침에 가볍게" :
    t === "evening" ? "퇴근 후" :
    t === "night" ? "밤에" :
    "오늘";

  if (courseNames.length === 1) {
    return `${prefix} ${courseNames[0]}부터 시작 어때요? ✨`;
  }

  const courseList = courseNames
    .map((name, i) => `${i + 1}) ${name}`)
    .join("\n");

  return `${prefix} 이런 코스 어때요? ✨\n${courseList}`;
}

/**
 * 🔥 v1.4: 날씨 보너스 가중치 (구조, 향후 확장)
 */
export function getWeatherWeight(
  placeCategory: string,
  weather?: "rain" | "hot" | "cold" | "clear"
): number {
  if (!weather) return 1.0;

  // 🔥 비 오면 → 실내 위주
  if (weather === "rain") {
    const indoorCategories = ["cafe", "restaurant", "pub", "gym", "stadium"];
    if (indoorCategories.includes(placeCategory)) {
      return 1.3;
    }
    return 0.8; // 실외 장소 페널티
  }

  // 🔥 더우면 → 카페/실내 우선
  if (weather === "hot") {
    if (placeCategory === "cafe" || placeCategory === "restaurant") {
      return 1.2;
    }
    if (placeCategory === "park") {
      return 0.9; // 실외 페널티
    }
  }

  // 🔥 추우면 → 실내 우선
  if (weather === "cold") {
    const indoorCategories = ["cafe", "restaurant", "pub", "gym"];
    if (indoorCategories.includes(placeCategory)) {
      return 1.2;
    }
    if (placeCategory === "park") {
      return 0.8; // 실외 페널티
    }
  }

  return 1.0;
}
