/**
 * 🔥 코스 이유 설명 (천재 모드 1.5)
 * 
 * 역할:
 * - 각 장소마다 추천 이유 설명
 * - 프로필 기반 맞춤 설명
 * - 자연스러운 설명 생성
 */

import type { MapPlace } from "@/types/map";
import type { SportsSenseProfile } from "./sportsSenseRecommendation";

/**
 * 🔥 장소 추천 이유 설명
 */
export function explainPlace(
  place: MapPlace,
  profile: SportsSenseProfile
): string {
  const placeName = (place.name || "").toLowerCase();
  const placeTags = (place.tags || []).map(t => 
    typeof t === 'string' ? t.toLowerCase() : ''
  );
  const placeTypes = (place.types || []).map(t => t.toLowerCase());
  const allText = [placeName, ...placeTags, ...placeTypes].join(' ');

  // 🔥 intent 기반 설명
  if (profile.todayIntent === "exercise" || profile.todayIntent === "play") {
    if (allText.includes("shower") || allText.includes("샤워")) {
      return "운동 후 정리하기 좋아요";
    }
    if (allText.includes("cafe") || allText.includes("카페")) {
      return "운동 후 휴식하기 좋아요";
    }
    if (allText.includes("gym") || allText.includes("헬스") || allText.includes("피트니스")) {
      return "지금 운동하기 딱 좋아요";
    }
  }

  if (profile.todayIntent === "watch") {
    if (allText.includes("stadium") || allText.includes("경기장") || allText.includes("스타디움")) {
      return "경기 관람하기 좋아요";
    }
    if (allText.includes("pub") || allText.includes("펍") || allText.includes("스포츠바")) {
      return "경기 후 분위기 좋아요";
    }
  }

  // 🔥 mood 기반 설명
  if (profile.mood === "quiet") {
    if (allText.includes("cafe") || allText.includes("카페") || 
        allText.includes("library") || allText.includes("도서관")) {
      return "지금 분위기에 잘 맞아요";
    }
  }

  if (profile.mood === "excited") {
    if (allText.includes("pub") || allText.includes("펍") || 
        allText.includes("bar") || allText.includes("스포츠바")) {
      return "지금 기분에 딱 맞아요";
    }
  }

  // 🔥 context 기반 설명
  if (profile.context === "partner") {
    if (allText.includes("cafe") || allText.includes("카페") || 
        allText.includes("park") || allText.includes("공원")) {
      return "데이트하기 좋은 장소예요";
    }
  }

  if (profile.context === "friends") {
    if (allText.includes("pub") || allText.includes("펍") || 
        allText.includes("restaurant") || allText.includes("식당")) {
      return "친구들과 함께하기 좋아요";
    }
  }

  // 🔥 v1.6: 이유 결합 (더 자연스러운 설명)
  if (profile.todayIntent === "play" || profile.todayIntent === "exercise") {
    if (allText.includes("cafe") || allText.includes("카페")) {
      return "운동 후 들르기 좋아요";
    }
  }

  if (allText.includes("quiet") || allText.includes("조용") || 
      profile.mood === "quiet") {
    return "지금 분위기에 잘 맞아요";
  }

  // 🔥 기본 설명
  if (place.rating && place.rating >= 4.5) {
    return "평점이 좋은 곳이에요";
  }

  if (place.rating && place.rating >= 4.0) {
    return "많이 선택된 장소예요";
  }

  return "추천 장소예요";
}

/**
 * 🔥 v1.6: 이유 결합 문장 (대화형)
 */
export function reasonSentence(
  place: MapPlace,
  profile: SportsSenseProfile
): string {
  return explainPlace(place, profile);
}

/**
 * 🔥 코스 전체 설명
 */
export function explainCourse(
  course: MapPlace[],
  profile: SportsSenseProfile
): string {
  if (course.length === 0) {
    return "";
  }

  const intentText = {
    watch: "경기 관람",
    exercise: "운동",
    play: "운동",
    alone: "혼자 시간",
  }[profile.todayIntent] || "활동";

  const contextText = {
    alone: "혼자",
    friends: "친구와",
    partner: "연인과",
    family: "가족과",
  }[profile.context] || "";

  if (course.length === 1) {
    return `${contextText} ${intentText}하기 좋은 코스예요`;
  }

  return `${contextText} ${intentText}하기 좋은 ${course.length}곳 코스예요`;
}
