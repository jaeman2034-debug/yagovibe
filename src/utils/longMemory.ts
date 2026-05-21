/**
 * 🔥 장기 기억 레이어 (천재 모드 2.0)
 * 
 * 역할:
 * - 사용자의 과거 행동 패턴 분석
 * - favoriteTags, avoided, bestTime 추출
 * - 오늘의 판단에 반영
 */

import type { MapPlace } from "@/types/map";

export interface LongMemory {
  favoriteTags: string[]; // 자주 찾는 태그
  avoided: string[]; // 피하는 태그
  bestTime: number[]; // 선호 시간대 (시간)
  favoriteCategories: string[]; // 선호 카테고리
  recentPlaces: string[]; // 최근 방문 장소 ID
  liked?: string[]; // 🔥 v2.1: 좋아요한 장소 ID
  hated?: string[]; // 🔥 v2.1: 싫어요한 장소 ID
}

/**
 * 🔥 행동 히스토리에서 장기 기억 추출
 */
export function extractLongMemory(
  behaviorScore: Record<string, number> = {},
  behaviorLog: Record<string, any> = {}
): LongMemory {
  // 🔥 태그별 점수 집계
  const tagScores: Record<string, number> = {};
  const categoryScores: Record<string, number> = {};
  const timeScores: Record<number, number> = {};
  const placeScores: Array<{ id: string; score: number }> = [];

  // 🔥 behaviorScore에서 장소별 점수 수집
  Object.entries(behaviorScore).forEach(([placeId, score]) => {
    if (score > 0) {
      placeScores.push({ id: placeId, score });
    }
  });

  // 🔥 behaviorLog에서 태그, 카테고리, 시간 정보 추출
  Object.values(behaviorLog).forEach((log: any) => {
    if (log.tags && Array.isArray(log.tags)) {
      log.tags.forEach((tag: string) => {
        tagScores[tag] = (tagScores[tag] || 0) + (log.score || 0);
      });
    }

    if (log.category) {
      categoryScores[log.category] = (categoryScores[log.category] || 0) + (log.score || 0);
    }

    if (log.timestamp) {
      const hour = new Date(log.timestamp.toDate?.() || log.timestamp).getHours();
      timeScores[hour] = (timeScores[hour] || 0) + (log.score || 0);
    }
  });

  // 🔥 상위 태그 추출 (favoriteTags)
  const favoriteTags = Object.entries(tagScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);

  // 🔥 하위 태그 추출 (avoided) - 점수가 음수이거나 매우 낮은 것
  const avoided = Object.entries(tagScores)
    .filter(([, score]) => score < 0)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([tag]) => tag);

  // 🔥 선호 카테고리 추출
  const favoriteCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);

  // 🔥 선호 시간대 추출 (peak hours)
  const bestTime = Object.entries(timeScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // 🔥 최근 방문 장소 (점수 높은 순)
  const recentPlaces = placeScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(p => p.id);

  return {
    favoriteTags,
    avoided,
    bestTime,
    favoriteCategories,
    recentPlaces,
  };
}

/**
 * 🔥 장소의 태그 추출
 */
function getPlaceTags(place: MapPlace): string[] {
  const tags: string[] = [];
  
  const name = (place.name || "").toLowerCase();
  const category = (place.category || "").toLowerCase();
  const placeTags = (place.tags || []).map(t => 
    typeof t === 'string' ? t.toLowerCase() : ''
  );
  const placeTypes = (place.types || []).map(t => t.toLowerCase());

  // 🔥 카테고리 태그
  if (category) tags.push(category);
  
  // 🔥 명시적 태그
  tags.push(...placeTags.filter(Boolean));
  
  // 🔥 타입 태그
  tags.push(...placeTypes.filter(Boolean));
  
  // 🔥 이름에서 태그 추출
  if (name.includes("cafe") || name.includes("카페")) tags.push("cafe");
  if (name.includes("pub") || name.includes("펍")) tags.push("pub");
  if (name.includes("gym") || name.includes("헬스")) tags.push("gym");
  if (name.includes("park") || name.includes("공원")) tags.push("park");
  if (name.includes("restaurant") || name.includes("식당")) tags.push("restaurant");
  if (name.includes("stadium") || name.includes("경기장")) tags.push("stadium");

  return [...new Set(tags)]; // 중복 제거
}

/**
 * 🔥 기억을 점수에 반영
 */
export function applyMemory(
  baseScore: number,
  place: MapPlace,
  memory: LongMemory
): number {
  let score = baseScore;
  const placeTags = getPlaceTags(place);
  const placeCategory = (place.category || "").toLowerCase();

  // 🔥 favoriteTags 매칭 → 보너스
  const favoriteMatch = memory.favoriteTags.some(tag => 
    placeTags.some(pt => pt.includes(tag) || tag.includes(pt))
  );
  if (favoriteMatch) {
    score += 0.3;
  }

  // 🔥 favoriteCategories 매칭 → 보너스
  const categoryMatch = memory.favoriteCategories.some(cat =>
    placeCategory.includes(cat) || cat.includes(placeCategory)
  );
  if (categoryMatch) {
    score += 0.2;
  }

  // 🔥 avoided 매칭 → 페널티
  const avoidedMatch = memory.avoided.some(tag =>
    placeTags.some(pt => pt.includes(tag) || tag.includes(pt))
  );
  if (avoidedMatch) {
    score -= 0.4;
  }

  // 🔥 recentPlaces 매칭 → 보너스 (최근 방문한 곳)
  if (memory.recentPlaces.includes(place.id)) {
    score += 0.2;
  }

  // 🔥 v2.1: 피드백 기반 조정
  if (memory.hated && memory.hated.includes(place.id)) {
    score -= 1.0; // 싫어요한 장소 페널티
  }

  if (memory.liked && memory.liked.includes(place.id)) {
    score += 0.5; // 좋아요한 장소 보너스
  }

  return score;
}

/**
 * 🔥 기억 기반 문장 생성
 */
export function memorySentence(
  courseNames: string[],
  memory: LongMemory
): string {
  if (courseNames.length === 0) {
    return "";
  }

  const courseList = courseNames
    .map((name, i) => `${i + 1}) ${name}`)
    .join("\n");

  // 🔥 기억이 충분히 쌓였을 때만 기억 기반 문장 사용
  if (memory.favoriteTags.length > 0 || memory.favoriteCategories.length > 0) {
    return `요즘 자주 찾는 스타일 반영했어요 ✨\n${courseList}`;
  }

  // 🔥 기억이 부족하면 기본 문장
  return `오늘 코스 ✨\n${courseList}`;
}
