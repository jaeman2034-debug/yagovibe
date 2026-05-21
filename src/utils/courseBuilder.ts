/**
 * 🔥 코스 생성기 (천재 모드 1.3)
 * 
 * 역할:
 * - A → B → C 흐름 추천
 * - 프로필 기반 코스 구성
 * - 학습 루프 연결
 */

import type { MapPlace } from "@/types/map";
import type { SportsSenseProfile } from "./sportsSenseRecommendation";
import { getTimeOfDay } from "./situationAwareness";
import { buildTypedCourse, determineCourseType, getCourseTypeDescription } from "./courseType";
import { toneSentence, talkSentence, chooseTone, type Tone } from "./toneEngine";
import { memorySentence, type LongMemory } from "./longMemory";
import { feedbackSentence, type FeedbackType } from "./feedbackLoop";
import { intentSentence, type InferenceContext } from "./intentInference";
import { calculateConfidence, generateDoubt, integrateConfidence, type ConfidenceContext } from "./selfCorrection";
import { generateFollowupQuestion, generateDialogSentence, type DialogContext } from "./dialogRhythm";
import { generateEthicalSentence, applySafeFilter } from "./ethicsSafety";

/**
 * 🔥 v1.4: 문장 선택 규칙 정교화 (상황 기반)
 */
function chooseSentence(
  courseNames: string[],
  profile: SportsSenseProfile,
  context?: { weather?: "rain" | "hot" | "cold" | "clear"; timeOfDay?: "morning" | "day" | "evening" | "night" }
): string {
  if (courseNames.length === 0) {
    return "";
  }

  const courseList = courseNames
    .map((name, i) => `${i + 1}) ${name}`)
    .join("\n");

  const timeOfDay = context?.timeOfDay;
  const weather = context?.weather;

  // 🔥 v1.4: 상황 기반 문장 선택
  // 비 오는 날
  if (weather === "rain") {
    return `비 오는 날엔 이런 코스 👍\n${courseList}`;
  }

  // 퇴근 후
  if (timeOfDay === "evening") {
    return `퇴근 후 실패 없는 루트 ✨\n${courseList}`;
  }

  // 아침
  if (timeOfDay === "morning") {
    return `아침에 가볍게 이런 코스 어때요? ✨\n${courseList}`;
  }

  // 밤
  if (timeOfDay === "night") {
    return `밤에 이런 코스 어때요? ✨\n${courseList}`;
  }

  // 더위
  if (weather === "hot") {
    return `더운 날엔 이런 코스 👍\n${courseList}`;
  }

  // 추위
  if (weather === "cold") {
    return `추운 날엔 이런 코스 👍\n${courseList}`;
  }

  // 🔥 기본 스타일 (상황 없을 때)
  return styleSentence(courseNames, profile, timeOfDay);
}

/**
 * 🔥 v1.4: 기본 문장 스타일 (fallback)
 */
function styleSentence(
  courseNames: string[],
  profile: SportsSenseProfile,
  timeOfDay?: "morning" | "day" | "evening" | "night"
): string {
  const courseList = courseNames
    .map((name, i) => `${i + 1}) ${name}`)
    .join("\n");

  const styles = [
    () => {
      const prefix = timeOfDay === "morning" ? "아침에 가볍게" :
                     timeOfDay === "evening" ? "퇴근 후" :
                     timeOfDay === "night" ? "밤에" : "오늘";
      return `${prefix} 이런 코스 어때요? ✨\n${courseList}`;
    },
    () => {
      return `지금 기분에 딱 맞는 코스예요 👌\n${courseList}`;
    },
    () => {
      return `이 순서면 실패 없어요 👍\n${courseList}`;
    },
  ];

  // 🔥 프로필 기반 시드로 일관성 유지
  const seed = (profile.todayIntent?.length || 0) + (profile.mood?.length || 0);
  const styleIndex = seed % styles.length;
  
  return styles[styleIndex]();
}

/**
 * 🔥 v1.4: 안전 가드
 */
export function safeCourse(course: MapPlace[]): MapPlace[] {
  if (!course || course.length === 0) {
    // 🔥 빈 코스일 때 기본 장소 반환 (실제로는 상위 추천 장소 사용)
    return [];
  }
  return course;
}

export interface Course {
  places: MapPlace[];
  description: string;
}

/**
 * 🔥 장소 카테고리 판단
 */
function getPlaceCategory(place: MapPlace): string {
  const name = (place.name || "").toLowerCase();
  const category = (place.category || "").toLowerCase();
  const types = (place.types || []).map(t => t.toLowerCase());
  const tags = (place.tags || []).map(t => t.toLowerCase());

  const allText = [name, category, ...types, ...tags].join(" ");

  if (
    allText.includes("경기장") ||
    allText.includes("stadium") ||
    allText.includes("스타디움") ||
    allText.includes("sports_complex")
  ) {
    return "stadium";
  }

  if (
    allText.includes("헬스") ||
    allText.includes("gym") ||
    allText.includes("피트니스") ||
    allText.includes("체육관")
  ) {
    return "gym";
  }

  if (
    allText.includes("카페") ||
    allText.includes("cafe") ||
    allText.includes("커피")
  ) {
    return "cafe";
  }

  if (
    allText.includes("펍") ||
    allText.includes("bar") ||
    allText.includes("스포츠바") ||
    allText.includes("pub")
  ) {
    return "pub";
  }

  if (
    allText.includes("식당") ||
    allText.includes("restaurant") ||
    allText.includes("맛집") ||
    allText.includes("food")
  ) {
    return "restaurant";
  }

  if (
    allText.includes("공원") ||
    allText.includes("park") ||
    allText.includes("산책")
  ) {
    return "park";
  }

  return "other";
}

/**
 * 🔥 코스 생성
 */
export function buildCourse(
  places: MapPlace[],
  profile: SportsSenseProfile,
  applySafetyFilter: boolean = true // 🔥 v2.6: 안전 필터 적용 여부
): Course {
  if (!places || places.length === 0) {
    return {
      places: [],
      description: "추천할 장소가 없어요",
    };
  }

  // 🔥 v2.6: 안전 필터 적용
  let safePlaces = places;
  if (applySafetyFilter) {
    safePlaces = applySafeFilter(places);
    // 🔥 v2.6: 안전 필터 후 장소가 없으면 원본 사용 (fallback)
    if (safePlaces.length === 0) {
      safePlaces = places;
    }
  }

  const first = safePlaces[0];
  const usedIds = new Set([first.id]);
  let course: MapPlace[] = [first];

  // 🔥 v1.5: 코스 타입 분화 우선 적용
  const courseType = determineCourseType(profile);
  const typedCourse = buildTypedCourse(safePlaces, courseType, profile);
  
  if (typedCourse.length > 1) {
    // 🔥 타입별 코스가 생성되면 사용
    course = typedCourse;
  }
  
  // 🔥 v1.4: 안전 가드 적용
  course = safeCourse(course);
  
  if (course.length === 0) {
    // 🔥 안전 가드로 빈 코스가 되면 첫 번째 장소만 반환
    return {
      places: [first],
      description: "주변 인기 장소",
    };
  }
  
  if (typedCourse.length > 1) {
    return {
      places: course,
      description: getCourseTypeDescription(courseType),
    };
  }

  // 🔥 v1.3: 기존 intent 기반 코스 구성 (fallback)
  if (profile.todayIntent === "watch") {
    // 경기 관람 → 펍 → 식사
    const pub = safePlaces.find(
      (p) =>
        !usedIds.has(p.id) &&
        (getPlaceCategory(p) === "pub" || 
         (p.tags && Array.isArray(p.tags) && p.tags.some(t => 
           typeof t === 'string' && (t.toLowerCase().includes("pub") || t.toLowerCase().includes("bar"))
         )))
    );
    if (pub) {
      course.push(pub);
      usedIds.add(pub.id);
    }

    const restaurant = safePlaces.find(
      (p) =>
        !usedIds.has(p.id) &&
        (getPlaceCategory(p) === "restaurant" ||
         (p.tags && Array.isArray(p.tags) && p.tags.some(t => 
           typeof t === 'string' && (t.toLowerCase().includes("food") || t.toLowerCase().includes("식당"))
         )))
    );
    if (restaurant) {
      course.push(restaurant);
    }
  } else if (profile.todayIntent === "exercise" || profile.todayIntent === "play") {
    // 운동 → 카페/샤워 → 식사
    const cafe = safePlaces.find(
      (p) =>
        !usedIds.has(p.id) &&
        (getPlaceCategory(p) === "cafe" ||
         (p.tags && Array.isArray(p.tags) && p.tags.some(t => 
           typeof t === 'string' && (t.toLowerCase().includes("cafe") || 
                                     t.toLowerCase().includes("카페") ||
                                     t.toLowerCase().includes("shower") ||
                                     t.toLowerCase().includes("샤워"))
         )))
    );
    if (cafe) {
      course.push(cafe);
      usedIds.add(cafe.id);
    }

    const restaurant = safePlaces.find(
      (p) =>
        !usedIds.has(p.id) &&
        (getPlaceCategory(p) === "restaurant" ||
         (p.tags && Array.isArray(p.tags) && p.tags.some(t => 
           typeof t === 'string' && (t.toLowerCase().includes("food") || t.toLowerCase().includes("식당"))
         )))
    );
    if (restaurant) {
      course.push(restaurant);
    }
  } else {
    // 쉬기/혼자 → 카페 → 식사
    const cafe = safePlaces.find(
      (p) =>
        !usedIds.has(p.id) &&
        (getPlaceCategory(p) === "cafe" ||
         (p.tags && Array.isArray(p.tags) && p.tags.some(t => 
           typeof t === 'string' && (t.toLowerCase().includes("cafe") || t.toLowerCase().includes("카페"))
         )))
    );
    if (cafe) {
      course.push(cafe);
      usedIds.add(cafe.id);
    }

    const restaurant = places.find(
      (p) =>
        !usedIds.has(p.id) &&
        (getPlaceCategory(p) === "restaurant" ||
         (p.tags && Array.isArray(p.tags) && p.tags.some(t => 
           typeof t === 'string' && (t.toLowerCase().includes("food") || t.toLowerCase().includes("식당"))
         )))
    );
    if (restaurant) {
      course.push(restaurant);
    }
  }

  // 🔥 코스 설명 생성
  const courseNames = course.map((p) => p.name || "장소").filter(Boolean);
  let description = "";

  if (courseNames.length === 1) {
    description = `${courseNames[0]}부터 시작 어때요?`;
  } else if (courseNames.length === 2) {
    description = `${courseNames[0]} → ${courseNames[1]} 코스`;
  } else if (courseNames.length === 3) {
    description = `${courseNames[0]} → ${courseNames[1]} → ${courseNames[2]} 코스`;
  } else {
    description = "오늘의 코스";
  }

  return {
    places: course,
    description,
  };
}

/**
 * 🔥 코스 문장 생성 (홈 배너용)
 */
export function generateCourseSentence(
  course: Course,
  profile: SportsSenseProfile,
  context?: { 
    weather?: "rain" | "hot" | "cold" | "clear"; 
    memory?: LongMemory; 
    inferenceContext?: InferenceContext;
    behaviorScoreCount?: number; // 🔥 v2.3: 행동 점수 데이터 개수
    hasRecentFeedback?: boolean; // 🔥 v2.3: 최근 피드백 여부
    dialogContext?: DialogContext; // 🔥 v2.4: 대화 컨텍스트
    includeFollowup?: boolean; // 🔥 v2.4: 후속 질문 포함 여부
  }
): string {
  if (course.places.length === 0) {
    return "";
  }

  // 🔥 v1.4: 상황 인식 레이어 통합
  const timeOfDay = getTimeOfDay();
  const courseNames = course.places.map(p => p.name || "장소").filter(Boolean);
  
  let baseSentence = "";
  
  // 🔥 v2.2: 의도 추론 기반 문장 우선 (추론 컨텍스트가 있을 때)
  if (context?.inferenceContext) {
    const intentBasedSentence = intentSentence(courseNames, profile.todayIntent as any);
    if (intentBasedSentence) {
      baseSentence = intentBasedSentence;
    }
  }
  
  // 🔥 v2.0: 기억 기반 문장 우선 (기억이 충분히 쌓였을 때)
  if (!baseSentence && context?.memory && 
      (context.memory.favoriteTags.length > 0 || context.memory.favoriteCategories.length > 0)) {
    const memoryBasedSentence = memorySentence(courseNames, context.memory);
    if (memoryBasedSentence) {
      baseSentence = memoryBasedSentence;
    }
  }
  
  // 🔥 v1.6: 인격 레이어 - 대화형 문장 생성
  if (!baseSentence) {
    // 🔥 v2.5: 성격 진화 반영
    const tone = chooseTone({ 
      timeOfDay, 
      weather: context?.weather,
      memory: context?.memory || null, // 🔥 v2.5: 성격 진화를 위한 기억 전달
    });
    const talkBasedSentence = talkSentence(courseNames, tone);
    
    // 🔥 v1.5: 톤 엔진 (fallback)
    const toneBasedSentence = toneSentence(courseNames, tone);
    
    // 🔥 v1.4: 상황 기반 문장 (fallback)
    const contextBasedSentence = chooseSentence(courseNames, profile, { 
      timeOfDay,
      weather: context?.weather 
    });
    
    baseSentence = talkBasedSentence || toneBasedSentence || contextBasedSentence;
  }

  // 🔥 v2.3: 신뢰도 계산 및 의심 로직 통합
  const confidenceContext: ConfidenceContext = {
    courseLength: course.places.length,
    memory: context?.memory || null,
    profile,
    hasRecentFeedback: context?.hasRecentFeedback || false,
    behaviorScoreCount: context?.behaviorScoreCount || 0,
  };

  const confidence = calculateConfidence(confidenceContext);
  const doubtMessage = generateDoubt(confidence);
  let finalSentence = integrateConfidence(baseSentence, confidence, doubtMessage);

  // 🔥 v2.4: 대화 리듬 - 후속 질문 추가
  if (context?.includeFollowup !== false) {
    const followupQuestion = generateFollowupQuestion(course, profile, context?.memory || null);
    finalSentence = generateDialogSentence(finalSentence, followupQuestion);
  }

  return finalSentence;
}
