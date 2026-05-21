/**
 * 🔥 천재 모드: 문구 자동 생성기
 * 
 * 역할:
 * - mood/intent 기반 카드 문구 생성
 * - "오늘의 코스" 설명 생성
 * - 토스트 메시지 생성
 */

export type Intent = "watch" | "play" | "chill";
export type Company = "solo" | "friends" | "date" | "family";
export type Mood = "calm" | "excited" | "focus" | "light";

const INTENT_LABELS: Record<Intent, string> = {
  watch: "경기 보기",
  play: "운동하기",
  chill: "쉬기",
};

const COMPANY_LABELS: Record<Company, string> = {
  solo: "혼자",
  friends: "친구",
  date: "연인",
  family: "가족",
};

const MOOD_LABELS: Record<Mood, string> = {
  calm: "조용",
  excited: "신남",
  focus: "집중",
  light: "가볍게",
};

/**
 * 🔥 "오늘의 코스" 설명 생성
 */
export function generateCourseDescription(
  intent: Intent,
  company: Company,
  mood: Mood
): string {
  return `${COMPANY_LABELS[company]} ${MOOD_LABELS[mood]} ${INTENT_LABELS[intent]} 코스`;
}

/**
 * 🔥 완료 직후 토스트 메시지 생성
 */
export function generateCompletionToast(
  intent: Intent,
  company: Company,
  mood: Mood
): string {
  // mood 기반 메시지
  const moodMessages: Record<Mood, string> = {
    calm: "조용한",
    excited: "신나는",
    focus: "집중할 수 있는",
    light: "가벼운",
  };
  
  // intent 기반 추천 문구
  const intentMessages: Record<Intent, string> = {
    watch: "경기 보기 좋은 장소",
    play: "운동하기 좋은 장소",
    chill: "쉬기 좋은 장소",
  };
  
  return `오늘 ${moodMessages[mood]} ${intentMessages[intent]}로 정렬했어요 ✨`;
}

/**
 * 🔥 홈 문장 생성 ("오늘은 {mood} 모드 → {intent}로 {장소} 어때요? ✨")
 */
export function generateHomeMessage(
  intent: Intent,
  company: Company,
  mood: Mood,
  topPlaces: string[] = []
): string {
  // 🔥 mood 텍스트 변환
  const moodText: Record<Mood, string> = {
    calm: "조용 모드",
    excited: "신남 모드",
    focus: "집중 모드",
    light: "가벼운 모드",
  };

  // 🔥 intent 텍스트 변환
  const intentText: Record<Intent, string> = {
    watch: "경기 관람",
    play: "운동",
    chill: "휴식",
  };

  if (topPlaces.length > 0) {
    // 🔥 상위 1개 장소 사용
    const topPlace = topPlaces[0];
    return `오늘은 ${moodText[mood]} → ${intentText[intent]}로 ${topPlace} 어때요? ✨`;
  }
  
  // 🔥 장소 정보가 없으면 기본 문장
  return `오늘은 ${moodText[mood]} → ${intentText[intent]} 코스`;
}

/**
 * 🔥 카드 문구 생성 (장소별)
 */
export function generatePlaceCardMessage(
  placeName: string,
  intent: Intent,
  mood: Mood
): string {
  const placeNameLower = placeName.toLowerCase();
  
  // intent 기반 메시지
  if (intent === "watch") {
    if (placeNameLower.includes("경기장") || placeNameLower.includes("스타디움")) {
      return "지금 경기 보러 가기 좋은 시간이에요 ⚽";
    }
    if (placeNameLower.includes("펍") || placeNameLower.includes("스포츠바")) {
      return "경기 중계 보면서 응원하기 좋은 곳이에요 🍺";
    }
  }
  
  if (intent === "play") {
    if (placeNameLower.includes("헬스") || placeNameLower.includes("피트니스")) {
      return "지금 운동하기 딱 좋은 시간이에요 💪";
    }
    if (placeNameLower.includes("공원")) {
      return "야외에서 운동하기 좋은 날씨예요 🌳";
    }
  }
  
  if (intent === "chill") {
    if (placeNameLower.includes("카페")) {
      return mood === "calm" 
        ? "조용하게 쉬기 좋은 카페예요 ☕"
        : "가볍게 쉬기 좋은 카페예요 ☕";
    }
    if (placeNameLower.includes("공원")) {
      return "산책하며 쉬기 좋은 곳이에요 🌿";
    }
  }
  
  // 기본 메시지
  return "오늘 기분에 맞는 장소예요 ✨";
}

/**
 * 🔥 배너 문구 생성
 */
export function generateBannerMessage(
  hasSportsSense: boolean,
  isProfileComplete: boolean
): string {
  if (isProfileComplete && !hasSportsSense) {
    return "나만의 스포츠 감각 켜기 ✨\n20초만에 오늘 코스 받기";
  }
  if (isProfileComplete && hasSportsSense) {
    return "스포츠 감각 다시 설정하기 🔄";
  }
  return "프로필을 완성하면 맞춤 추천을 받을 수 있어요! 👤";
}
