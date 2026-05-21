/**
 * 🔥 스포츠 감각 기반 추천 엔진
 * 
 * 철학:
 * - mood, context, todayIntent 기반 장소 필터링
 * - 즉시 변화 체감
 * - 살아있는 프로필
 */

import type { MapPlace } from "@/types/map";
import { contextWeight, type Context } from "./contextWeight";
import { adaptiveWeight } from "./personaEvolution";

export type TodayIntent = "watch" | "exercise" | "play" | "alone";
export type Context = "alone" | "friends" | "partner" | "family";
export type Mood = "quiet" | "excited" | "focused" | "light";

export interface SportsSenseProfile {
  todayIntent: TodayIntent;
  context: Context;
  mood: Mood;
  behaviorScore?: number;
}

/**
 * 🔥 스포츠 감각 기반 장소 점수 계산 (v1.1 엔진 고도화)
 * 
 * 가중치 공식:
 * score = 기본점수 + mood × 1.3 + intent × 1.2 - 거리 × 0.8 + 시간대 × 1.1 + 최근클릭 × 1.5
 * 
 * 가중치:
 * - 기본점수: 평점 기반 (3점 기준)
 * - mood 가중치: 1.3배 (조용/신남/집중/가볍게)
 * - intent 가중치: 1.2배 (경기보기/운동하기/쉬기)
 * - 거리 페널티: 거리(km) × 0.8 (최대 5km)
 * - 시간대 보너스: 1.1배 (저녁 18시 이후)
 * - 최근클릭 보너스: 클릭 횟수 × 1.5
 */
export function scorePlaceBySportsSense(
  place: MapPlace,
  profile: SportsSenseProfile,
  distance: number,
  context?: { hour?: number; behaviorScore?: Record<string, number>; weather?: "rain" | "hot" | "cold" | "clear"; memory?: LongMemory }
): number {
  // 🔥 기본점수 (평점 기반, 기본값 3점)
  const base = place.rating ?? 3;

  // 🔥 mood 가중치 (1.3배)
  const moodWeight = getMoodWeight(place, profile.mood);

  // 🔥 intent 가중치 (1.2배)
  const intentWeight = getIntentWeight(place, profile.todayIntent);

  // 🔥 v1.4: 가중치 통합기 사용
  const contextForWeight: Context = {
    hour: context?.hour,
    weather: context?.weather as "rain" | "hot" | "cold" | "clear" | undefined,
    distance: distance,
  };
  const contextWeightValue = contextWeight(place, contextForWeight);

  // 🔥 v1.4: 시간대 보너스 (상황 인식 레이어)
  const timeBonus = getTimeBonusWeight(place, context?.hour);

  // 🔥 최근클릭 보너스 (클릭 횟수 × 1.5)
  const clickBonus = getClickBonus(place.id, context?.behaviorScore);

  // 🔥 최종 점수 계산 (가중치 통합기 반영)
  let score = 
    base +
    moodWeight * 1.3 +
    intentWeight * 1.2 +
    (contextWeightValue - 1.0) * 10 + // 가중치를 점수로 변환
    timeBonus * 1.1 +
    clickBonus;

  // 🔥 v2.0: 장기 기억 반영
  if (context?.memory) {
    score = applyMemory(score, place, context.memory);
    
    // 🔥 v2.5: 학습 가중치 조정
    const baseWeight = 1.0;
    const adjustedWeight = adaptiveWeight(baseWeight, context.memory);
    score = score * adjustedWeight;
  }

  return Math.max(0, Math.round(score * 100) / 100); // 최소 0점, 소수점 2자리
}

// 🔥 getBaseScore 제거 (직접 base 사용)

/**
 * 🔥 mood 기반 점수 계산
 */
function getMoodScore(place: MapPlace, mood: Mood): number {
  const placeName = (place.name || "").toLowerCase();
  const placeCategory = (place.category || "").toLowerCase();
  const placeTypes = (place.types || []).map(t => t.toLowerCase());

  switch (mood) {
    case "quiet":
      // 조용한 곳: 도서관, 카페, 공원, 박물관
      if (
        placeName.includes("카페") ||
        placeName.includes("도서관") ||
        placeName.includes("공원") ||
        placeName.includes("박물관") ||
        placeTypes.includes("cafe") ||
        placeTypes.includes("library") ||
        placeTypes.includes("park")
      ) {
        return 100;
      }
      // 시끄러운 곳: 펍, 클럽, 노래방
      if (
        placeName.includes("펍") ||
        placeName.includes("클럽") ||
        placeName.includes("노래방") ||
        placeTypes.includes("night_club") ||
        placeTypes.includes("bar")
      ) {
        return 20;
      }
      return 50;

    case "excited":
      // 신나는 곳: 펍, 스포츠바, 경기장
      if (
        placeName.includes("펍") ||
        placeName.includes("스포츠바") ||
        placeName.includes("경기장") ||
        placeName.includes("스타디움") ||
        placeTypes.includes("bar") ||
        placeTypes.includes("stadium") ||
        placeTypes.includes("sports_complex")
      ) {
        return 100;
      }
      // 너무 조용한 곳: 도서관
      if (placeName.includes("도서관") || placeTypes.includes("library")) {
        return 30;
      }
      return 60;

    case "focused":
      // 집중할 수 있는 곳: 도서관, 스터디카페, 헬스장
      if (
        placeName.includes("도서관") ||
        placeName.includes("스터디") ||
        placeName.includes("헬스") ||
        placeName.includes("피트니스") ||
        placeTypes.includes("library") ||
        placeTypes.includes("gym")
      ) {
        return 100;
      }
      return 50;

    case "light":
      // 가벼운 곳: 카페, 공원, 산책로
      if (
        placeName.includes("카페") ||
        placeName.includes("공원") ||
        placeName.includes("산책") ||
        placeTypes.includes("cafe") ||
        placeTypes.includes("park")
      ) {
        return 100;
      }
      return 60;

    default:
      return 50;
  }
}

/**
 * 🔥 context 기반 점수 계산
 */
function getContextScore(place: MapPlace, context: Context): number {
  const placeName = (place.name || "").toLowerCase();
  const placeTypes = (place.types || []).map(t => t.toLowerCase());

  switch (context) {
    case "alone":
      // 혼자 가기 좋은 곳: 카페, 도서관, 공원
      if (
        placeName.includes("카페") ||
        placeName.includes("도서관") ||
        placeName.includes("공원") ||
        placeTypes.includes("cafe") ||
        placeTypes.includes("library") ||
        placeTypes.includes("park")
      ) {
        return 100;
      }
      return 60;

    case "friends":
      // 친구와 가기 좋은 곳: 펍, 식당, 노래방
      if (
        placeName.includes("펍") ||
        placeName.includes("식당") ||
        placeName.includes("노래방") ||
        placeTypes.includes("bar") ||
        placeTypes.includes("restaurant") ||
        placeTypes.includes("night_club")
      ) {
        return 100;
      }
      return 60;

    case "partner":
      // 연인과 가기 좋은 곳: 카페, 식당, 공원, 영화관
      if (
        placeName.includes("카페") ||
        placeName.includes("식당") ||
        placeName.includes("공원") ||
        placeName.includes("영화관") ||
        placeTypes.includes("cafe") ||
        placeTypes.includes("restaurant") ||
        placeTypes.includes("park") ||
        placeTypes.includes("movie_theater")
      ) {
        return 100;
      }
      return 60;

    case "family":
      // 가족과 가기 좋은 곳: 공원, 식당, 박물관, 놀이공원
      if (
        placeName.includes("공원") ||
        placeName.includes("식당") ||
        placeName.includes("박물관") ||
        placeName.includes("놀이공원") ||
        placeTypes.includes("park") ||
        placeTypes.includes("restaurant") ||
        placeTypes.includes("museum") ||
        placeTypes.includes("amusement_park")
      ) {
        return 100;
      }
      return 60;

    default:
      return 50;
  }
}

/**
 * 🔥 todayIntent 기반 점수 계산
 */
function getIntentScore(place: MapPlace, intent: TodayIntent): number {
  const placeName = (place.name || "").toLowerCase();
  const placeCategory = (place.category || "").toLowerCase();
  const placeTypes = (place.types || []).map(t => t.toLowerCase());

  switch (intent) {
    case "watch":
      // 경기 보기: 경기장, 스포츠바, 펍
      if (
        placeName.includes("경기장") ||
        placeName.includes("스타디움") ||
        placeName.includes("스포츠바") ||
        placeName.includes("펍") ||
        placeTypes.includes("stadium") ||
        placeTypes.includes("sports_complex") ||
        placeTypes.includes("bar")
      ) {
        return 100;
      }
      return 40;

    case "exercise":
      // 운동하기: 헬스장, 공원, 수영장, 체육관
      if (
        placeName.includes("헬스") ||
        placeName.includes("피트니스") ||
        placeName.includes("공원") ||
        placeName.includes("수영장") ||
        placeName.includes("체육관") ||
        placeTypes.includes("gym") ||
        placeTypes.includes("park") ||
        placeTypes.includes("swimming_pool") ||
        placeTypes.includes("sports_complex")
      ) {
        return 100;
      }
      return 40;

    case "play":
      // 놀기: 노래방, 펍, 클럽, 게임센터
      if (
        placeName.includes("노래방") ||
        placeName.includes("펍") ||
        placeName.includes("클럽") ||
        placeName.includes("게임") ||
        placeTypes.includes("night_club") ||
        placeTypes.includes("bar") ||
        placeTypes.includes("amusement_center")
      ) {
        return 100;
      }
      return 40;

    case "alone":
      // 혼자 시간: 카페, 도서관, 공원
      if (
        placeName.includes("카페") ||
        placeName.includes("도서관") ||
        placeName.includes("공원") ||
        placeTypes.includes("cafe") ||
        placeTypes.includes("library") ||
        placeTypes.includes("park")
      ) {
        return 100;
      }
      return 50;

    default:
      return 50;
  }
}

/**
 * 🔥 거리 페널티 계산 (거리 멀수록 감점)
 */
function getDistancePenalty(distance: number): number {
  if (distance < 0.5) return 0;    // 500m 이내: 페널티 없음
  if (distance < 1) return 2;     // 1km 이내: -2점
  if (distance < 2) return 5;      // 2km 이내: -5점
  if (distance < 5) return 10;     // 5km 이내: -10점
  return 20; // 5km 이상: -20점
}

// 🔥 v1.4: getTimeBonus 제거 (getTimeBonusWeight로 통합됨)

/**
 * 🔥 스포츠 감각 기반 장소 리랭킹
 */
/**
 * 🔥 v1.4: 안전한 재랭킹 가드
 */
export function safeRank(
  places: MapPlace[],
  profile: SportsSenseProfile,
  userLocation: { lat: number; lng: number } | null,
  context?: { hour?: number; behaviorScore?: Record<string, number>; weather?: "rain" | "hot" | "cold" | "clear" }
): MapPlace[] {
  try {
    const ranked = rerankPlacesBySportsSense(places, profile, userLocation, context);
    
    // 🔥 안전 가드: 빈 배열이면 원본 반환
    if (!ranked || ranked.length === 0) {
      console.warn("⚠️ [safeRank] 재랭킹 결과가 비어있음. 원본 반환.");
      return places;
    }
    
    return ranked;
  } catch (error) {
    console.error("❌ [safeRank] 재랭킹 실패:", error);
    // 🔥 오류 시 원본 반환
    return places;
  }
}

/**
 * 🔥 v1.4: 스포츠 감각 기반 장소 리랭킹 (상황 인식 레이어 포함)
 */
export function rerankPlacesBySportsSense(
  places: MapPlace[],
  profile: SportsSenseProfile,
  userLocation: { lat: number; lng: number } | null,
  context?: { hour?: number; behaviorScore?: Record<string, number>; weather?: "rain" | "hot" | "cold" | "clear" }
): MapPlace[] {
  if (!userLocation) {
    return places; // 위치 정보가 없으면 원본 반환
  }

  // 🔥 거리 계산 헬퍼 (미터 단위)
  const getDistance = (place: MapPlace): number => {
    if (!place.lat || !place.lng) return 999999;
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = ((place.lat - userLocation.lat) * Math.PI) / 180;
    const dLon = ((place.lng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((place.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // 미터 단위 반환
  };

  // 🔥 점수 계산 및 정렬
  const scored = places.map(place => {
    const distance = getDistance(place);
    const score = scorePlaceBySportsSense(place, profile, distance, context);
    return { place, score, distance };
  });

  // 🔥 점수 순 정렬 (점수 같으면 거리 순)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.distance - b.distance;
  });

  return scored.map(item => item.place);
}

/**
 * 🔥 "오늘의 코스" 생성
 */
export function generateTodayCourse(
  places: MapPlace[],
  profile: SportsSenseProfile,
  userLocation: { lat: number; lng: number }
): { places: MapPlace[]; description: string } {
  const reranked = rerankPlacesBySportsSense(places, profile, userLocation);
  const topPlaces = reranked.slice(0, 3); // 상위 3개

  // 🔥 코스 설명 생성
  const moodText = {
    quiet: "조용한",
    excited: "신나는",
    focused: "집중할 수 있는",
    light: "가벼운",
  }[profile.mood];

  const contextText = {
    alone: "혼자",
    friends: "친구와",
    partner: "연인과",
    family: "가족과",
  }[profile.context];

  const intentText = {
    watch: "경기 보기",
    exercise: "운동하기",
    play: "놀기",
    alone: "혼자 시간",
  }[profile.todayIntent];

  const description = `${contextText} ${moodText} ${intentText} 코스`;

  return {
    places: topPlaces,
    description,
  };
}
