/**
 * 🔥 코스 타입 분화 (천재 모드 1.5)
 * 
 * 역할:
 * - 운동형 코스
 * - 데이트형 코스
 * - 관람형 코스
 * - 각 타입별 특화 패턴
 */

import type { MapPlace } from "@/types/map";
import type { SportsSenseProfile } from "./sportsSenseRecommendation";

export type CourseType = "exercise" | "date" | "watch" | "chill";

/**
 * 🔥 코스 타입 판단
 */
export function determineCourseType(profile: SportsSenseProfile): CourseType {
  // 🔥 intent 기반 타입 판단
  if (profile.todayIntent === "exercise" || profile.todayIntent === "play") {
    return "exercise";
  }

  if (profile.todayIntent === "watch") {
    return "watch";
  }

  if (profile.context === "partner") {
    return "date";
  }

  return "chill";
}

/**
 * 🔥 운동형 코스 생성
 */
function buildExerciseCourse(places: MapPlace[], usedIds: Set<string>): MapPlace[] {
  const course: MapPlace[] = [];
  
  // 1. 헬스/운동장
  const gym = places.find(p => 
    !usedIds.has(p.id) &&
    (p.name?.toLowerCase().includes("헬스") ||
     p.name?.toLowerCase().includes("gym") ||
     p.name?.toLowerCase().includes("피트니스") ||
     p.category?.toLowerCase().includes("gym") ||
     p.types?.some(t => t.toLowerCase().includes("gym")))
  );
  if (gym) {
    course.push(gym);
    usedIds.add(gym.id);
  }

  // 2. 샤워/카페
  const cafe = places.find(p =>
    !usedIds.has(p.id) &&
    (p.name?.toLowerCase().includes("카페") ||
     p.name?.toLowerCase().includes("cafe") ||
     p.name?.toLowerCase().includes("샤워") ||
     p.category?.toLowerCase().includes("cafe") ||
     p.types?.some(t => t.toLowerCase().includes("cafe")))
  );
  if (cafe) {
    course.push(cafe);
    usedIds.add(cafe.id);
  }

  // 3. 식사
  const restaurant = places.find(p =>
    !usedIds.has(p.id) &&
    (p.name?.toLowerCase().includes("식당") ||
     p.name?.toLowerCase().includes("restaurant") ||
     p.name?.toLowerCase().includes("맛집") ||
     p.category?.toLowerCase().includes("restaurant") ||
     p.types?.some(t => t.toLowerCase().includes("restaurant")))
  );
  if (restaurant) {
    course.push(restaurant);
  }

  return course;
}

/**
 * 🔥 데이트형 코스 생성
 */
function buildDateCourse(places: MapPlace[], usedIds: Set<string>): MapPlace[] {
  const course: MapPlace[] = [];
  
  // 1. 카페/브런치
  const cafe = places.find(p =>
    !usedIds.has(p.id) &&
    (p.name?.toLowerCase().includes("카페") ||
     p.name?.toLowerCase().includes("cafe") ||
     p.name?.toLowerCase().includes("브런치") ||
     p.category?.toLowerCase().includes("cafe") ||
     p.types?.some(t => t.toLowerCase().includes("cafe")))
  );
  if (cafe) {
    course.push(cafe);
    usedIds.add(cafe.id);
  }

  // 2. 공원/산책
  const park = places.find(p =>
    !usedIds.has(p.id) &&
    (p.name?.toLowerCase().includes("공원") ||
     p.name?.toLowerCase().includes("park") ||
     p.name?.toLowerCase().includes("산책") ||
     p.category?.toLowerCase().includes("park") ||
     p.types?.some(t => t.toLowerCase().includes("park")))
  );
  if (park) {
    course.push(park);
    usedIds.add(park.id);
  }

  // 3. 식사/디저트
  const restaurant = places.find(p =>
    !usedIds.has(p.id) &&
    (p.name?.toLowerCase().includes("식당") ||
     p.name?.toLowerCase().includes("restaurant") ||
     p.name?.toLowerCase().includes("맛집") ||
     p.name?.toLowerCase().includes("디저트") ||
     p.category?.toLowerCase().includes("restaurant") ||
     p.types?.some(t => t.toLowerCase().includes("restaurant")))
  );
  if (restaurant) {
    course.push(restaurant);
  }

  return course;
}

/**
 * 🔥 관람형 코스 생성
 */
function buildWatchCourse(places: MapPlace[], usedIds: Set<string>): MapPlace[] {
  const course: MapPlace[] = [];
  
  // 1. 경기장
  const stadium = places.find(p =>
    !usedIds.has(p.id) &&
    (p.name?.toLowerCase().includes("경기장") ||
     p.name?.toLowerCase().includes("stadium") ||
     p.name?.toLowerCase().includes("스타디움") ||
     p.category?.toLowerCase().includes("stadium") ||
     p.types?.some(t => t.toLowerCase().includes("stadium")))
  );
  if (stadium) {
    course.push(stadium);
    usedIds.add(stadium.id);
  }

  // 2. 펍/스포츠바
  const pub = places.find(p =>
    !usedIds.has(p.id) &&
    (p.name?.toLowerCase().includes("펍") ||
     p.name?.toLowerCase().includes("pub") ||
     p.name?.toLowerCase().includes("스포츠바") ||
     p.name?.toLowerCase().includes("bar") ||
     p.category?.toLowerCase().includes("bar") ||
     p.types?.some(t => t.toLowerCase().includes("bar")))
  );
  if (pub) {
    course.push(pub);
    usedIds.add(pub.id);
  }

  // 3. 식사
  const restaurant = places.find(p =>
    !usedIds.has(p.id) &&
    (p.name?.toLowerCase().includes("식당") ||
     p.name?.toLowerCase().includes("restaurant") ||
     p.name?.toLowerCase().includes("맛집") ||
     p.category?.toLowerCase().includes("restaurant") ||
     p.types?.some(t => t.toLowerCase().includes("restaurant")))
  );
  if (restaurant) {
    course.push(restaurant);
  }

  return course;
}

/**
 * 🔥 코스 타입별 생성
 */
export function buildTypedCourse(
  places: MapPlace[],
  profile: SportsSenseProfile
): MapPlace[] {
  if (!places || places.length === 0) {
    return [];
  }

  const first = places[0];
  const usedIds = new Set([first.id]);
  const course: MapPlace[] = [first];

  const courseType = determineCourseType(profile);

  // 🔥 타입별 코스 생성
  let additionalPlaces: MapPlace[] = [];
  switch (courseType) {
    case "exercise":
      additionalPlaces = buildExerciseCourse(places, usedIds);
      break;
    case "date":
      additionalPlaces = buildDateCourse(places, usedIds);
      break;
    case "watch":
      additionalPlaces = buildWatchCourse(places, usedIds);
      break;
    default:
      // chill 타입은 기존 로직 사용
      break;
  }

  course.push(...additionalPlaces);

  return course.filter(Boolean);
}

/**
 * 🔥 코스 타입별 설명 생성
 */
export function getCourseTypeDescription(courseType: CourseType): string {
  const descriptions: Record<CourseType, string> = {
    exercise: "운동형 코스",
    date: "데이트형 코스",
    watch: "관람형 코스",
    chill: "휴식형 코스",
  };

  return descriptions[courseType] || "오늘의 코스";
}
