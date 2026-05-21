/**
 * 🔥 가중치 통합기 (천재 모드 1.4)
 * 
 * 역할:
 * - 시간대 가중치
 * - 날씨 가중치
 * - 거리 페널티
 * - 통합 가중치 계산
 */

import type { MapPlace } from "@/types/map";
import { getTimeOfDay } from "./situationAwareness";

export interface Context {
  hour?: number;
  weather?: "rain" | "hot" | "cold" | "clear";
  distance?: number; // 미터 단위
}

/**
 * 🔥 가중치 통합 계산
 */
export function contextWeight(
  place: MapPlace,
  context?: Context
): number {
  let weight = 1.0;

  // 🔥 시간대 가중치
  const timeOfDay = context?.hour !== undefined
    ? (context.hour < 10 ? "morning" :
       context.hour < 17 ? "day" :
       context.hour < 22 ? "evening" : "night")
    : getTimeOfDay();

  const placeName = (place.name || "").toLowerCase();
  const placeTags = (place.tags || []).map(t => 
    typeof t === 'string' ? t.toLowerCase() : ''
  );
  const placeTypes = (place.types || []).map(t => t.toLowerCase());
  const allText = [placeName, ...placeTags, ...placeTypes].join(' ');

  // 🔥 저녁 → 펍 보너스
  if (timeOfDay === "evening" && 
      (allText.includes("pub") || allText.includes("펍") || 
       allText.includes("bar") || allText.includes("스포츠바"))) {
    weight += 0.2;
  }

  // 🔥 아침 → 카페 보너스
  if (timeOfDay === "morning" && 
      (allText.includes("cafe") || allText.includes("카페") || 
       allText.includes("커피"))) {
    weight += 0.2;
  }

  // 🔥 밤 → 펍 최대 보너스
  if (timeOfDay === "night" && 
      (allText.includes("pub") || allText.includes("펍") || 
       allText.includes("bar"))) {
    weight += 0.3;
  }

  // 🔥 날씨 가중치
  if (context?.weather) {
    const isIndoor = allText.includes("cafe") || 
                     allText.includes("카페") ||
                     allText.includes("restaurant") ||
                     allText.includes("식당") ||
                     allText.includes("pub") ||
                     allText.includes("펍") ||
                     allText.includes("gym") ||
                     allText.includes("헬스") ||
                     allText.includes("stadium") ||
                     allText.includes("경기장");

    // 🔥 비 오면 → 실내 위주
    if (context.weather === "rain" && isIndoor) {
      weight += 0.3;
    } else if (context.weather === "rain" && !isIndoor) {
      weight -= 0.2; // 실외 페널티
    }

    // 🔥 더우면 → 카페/실내 우선
    if (context.weather === "hot" && 
        (allText.includes("cafe") || allText.includes("카페") ||
         allText.includes("restaurant") || allText.includes("식당"))) {
      weight += 0.2;
    } else if (context.weather === "hot" && 
               (allText.includes("park") || allText.includes("공원"))) {
      weight -= 0.1; // 실외 페널티
    }

    // 🔥 추우면 → 실내 우선
    if (context.weather === "cold" && isIndoor) {
      weight += 0.2;
    } else if (context.weather === "cold" && !isIndoor) {
      weight -= 0.2; // 실외 페널티
    }
  }

  // 🔥 거리 페널티
  if (context?.distance !== undefined) {
    const distanceKm = context.distance / 1000;
    const penalty = Math.min(distanceKm, 5) * 0.1;
    weight -= penalty;
  }

  // 🔥 최소 가중치 보장
  return Math.max(0.1, weight);
}
