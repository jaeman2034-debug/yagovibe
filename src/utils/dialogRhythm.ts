/**
 * 🔥 대화 리듬 레이어 (천재 모드 2.4)
 * 
 * 역할:
 * - 추천 후 후속 질문 생성
 * - 사용자 응답 처리
 * - 추천 재조정
 */

import type { MapPlace } from "@/types/map";
import type { Course } from "./courseBuilder";
import type { SportsSenseProfile } from "./sportsSenseRecommendation";
import type { LongMemory } from "./longMemory";

export interface DialogContext {
  prefer?: "quiet" | "lively" | "close" | "far" | "cheap" | "premium";
  radius?: number; // 거리 반경 (미터)
  mood?: "quiet" | "excited" | "focused" | "light";
  intent?: "watch" | "exercise" | "play" | "alone";
}

/**
 * 🔥 후속 질문 생성
 */
export function generateFollowupQuestion(
  course: Course,
  profile: SportsSenseProfile,
  memory: LongMemory | null
): string {
  const questions: string[] = [];

  // 🔥 v2.4: 코스 기반 질문
  if (course.places.length > 0) {
    questions.push("1번 장소 마음에 들어요?");
    questions.push("이 코스 괜찮으신가요?");
  }

  // 🔥 v2.4: 프로필 기반 질문
  if (profile.mood === "quiet") {
    questions.push("조금 더 조용한 곳으로 바꿀까요?");
  }

  if (profile.context === "alone") {
    questions.push("혼자 가기 좋은 곳으로 바꿀까요?");
  }

  // 🔥 v2.4: 기억 기반 질문
  if (memory?.favoriteTags.length > 0) {
    questions.push("평소 좋아하시는 스타일로 바꿀까요?");
  }

  // 🔥 v2.4: 거리 기반 질문
  questions.push("거리 더 가까운 게 좋을까요?");
  questions.push("조금 더 멀어도 괜찮으신가요?");

  // 🔥 랜덤 선택
  if (questions.length === 0) {
    return "이 코스 어떠세요?";
  }

  return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * 🔥 응답 처리
 */
export function processReply(
  answer: string,
  currentContext: DialogContext
): DialogContext {
  const lowerAnswer = answer.toLowerCase();
  const updatedContext = { ...currentContext };

  // 🔥 v2.4: 조용함 관련 응답
  if (lowerAnswer.includes("조용") || lowerAnswer.includes("quiet") || lowerAnswer.includes("조용한")) {
    updatedContext.prefer = "quiet";
    updatedContext.mood = "quiet";
  }

  // 🔥 v2.4: 활기 관련 응답
  if (lowerAnswer.includes("활기") || lowerAnswer.includes("lively") || lowerAnswer.includes("시끄러운")) {
    updatedContext.prefer = "lively";
    updatedContext.mood = "excited";
  }

  // 🔥 v2.4: 거리 관련 응답
  if (lowerAnswer.includes("가까") || lowerAnswer.includes("close") || lowerAnswer.includes("근처")) {
    updatedContext.prefer = "close";
    updatedContext.radius = 1000; // 1km
  }

  if (lowerAnswer.includes("멀") || lowerAnswer.includes("far") || lowerAnswer.includes("먼")) {
    updatedContext.prefer = "far";
    updatedContext.radius = 5000; // 5km
  }

  // 🔥 v2.4: 가격 관련 응답
  if (lowerAnswer.includes("싼") || lowerAnswer.includes("cheap") || lowerAnswer.includes("저렴")) {
    updatedContext.prefer = "cheap";
  }

  if (lowerAnswer.includes("비싼") || lowerAnswer.includes("premium") || lowerAnswer.includes("고급")) {
    updatedContext.prefer = "premium";
  }

  // 🔥 v2.4: 긍정 응답
  if (lowerAnswer.includes("좋") || lowerAnswer.includes("ok") || lowerAnswer.includes("괜찮") || lowerAnswer.includes("좋아")) {
    // 긍정 응답은 컨텍스트 유지
  }

  // 🔥 v2.4: 부정 응답
  if (lowerAnswer.includes("안") || lowerAnswer.includes("no") || lowerAnswer.includes("싫") || lowerAnswer.includes("별로")) {
    // 부정 응답은 재조정 필요
    updatedContext.prefer = undefined; // 재조정 신호
  }

  return updatedContext;
}

/**
 * 🔥 대화 문장 생성
 */
export function generateDialogSentence(
  baseSentence: string,
  followupQuestion: string
): string {
  return `${baseSentence}\n\n💬 ${followupQuestion}`;
}

/**
 * 🔥 응답 기반 프로필 업데이트
 */
export function updateProfileFromDialog(
  profile: SportsSenseProfile,
  dialogContext: DialogContext
): SportsSenseProfile {
  const updatedProfile = { ...profile };

  // 🔥 v2.4: 대화 컨텍스트 반영
  if (dialogContext.mood) {
    updatedProfile.mood = dialogContext.mood;
  }

  if (dialogContext.intent) {
    updatedProfile.todayIntent = dialogContext.intent;
  }

  return updatedProfile;
}

/**
 * 🔥 응답 기반 장소 필터링
 */
export function filterPlacesByDialog(
  places: MapPlace[],
  dialogContext: DialogContext,
  userLocation?: { lat: number; lng: number }
): MapPlace[] {
  let filtered = [...places];

  // 🔥 v2.4: 거리 필터링
  if (dialogContext.radius && userLocation) {
    filtered = filtered.filter(place => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        place.lat,
        place.lng
      );
      return distance <= dialogContext.radius!;
    });
  }

  // 🔥 v2.4: 선호도 필터링
  if (dialogContext.prefer === "quiet") {
    filtered = filtered.filter(place => 
      place.tags?.includes("quiet") || 
      place.tags?.includes("조용한") ||
      (place.name && (place.name.includes("카페") || place.name.includes("cafe")))
    );
  }

  if (dialogContext.prefer === "lively") {
    filtered = filtered.filter(place => 
      place.tags?.includes("pub") || 
      place.tags?.includes("펍") ||
      place.tags?.includes("stadium")
    );
  }

  return filtered;
}

/**
 * 🔥 거리 계산 (Haversine 공식)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위
}
