/**
 * 🔥 추천 재랭킹 트리거 (1.2 실전 연결)
 * 
 * 역할:
 * - 프로필 기반 재랭킹
 * - GENIUS_UPDATED 이벤트 발송
 */

import type { SportsSenseProfile } from "./sportsSenseRecommendation";
import { rerankPlacesBySportsSense } from "./sportsSenseRecommendation";
import type { MapPlace } from "@/types/map";

// 🔥 타입 변환 헬퍼
function convertMood(mood: string): "quiet" | "excited" | "focused" | "light" {
  if (mood === "calm" || mood === "quiet") return "quiet";
  if (mood === "excited") return "excited";
  if (mood === "focus" || mood === "focused") return "focused";
  return "light";
}

function convertContext(context: string): "alone" | "friends" | "partner" | "family" {
  if (context === "solo" || context === "alone") return "alone";
  if (context === "friends") return "friends";
  if (context === "date" || context === "partner") return "partner";
  return "family";
}

function convertIntent(intent: string): "watch" | "exercise" | "play" | "alone" {
  if (intent === "watch") return "watch";
  if (intent === "play" || intent === "exercise") return "exercise";
  if (intent === "chill") return "play";
  return "alone";
}

/**
 * 🔥 재랭킹 트리거
 */
export async function triggerRecalc(
  profile: SportsSenseProfile,
  places: MapPlace[],
  userLocation: { lat: number; lng: number } | null,
  context?: { hour?: number; behaviorScore?: Record<string, number> }
) {
  if (!places || places.length === 0) {
    console.warn("⚠️ [triggerRecalc] 장소 목록이 비어있습니다.");
    return;
  }

  if (!userLocation) {
    console.warn("⚠️ [triggerRecalc] 사용자 위치가 없습니다.");
    return;
  }

  try {
    // 🔥 재랭킹
    const ranked = rerankPlacesBySportsSense(
      places,
      profile,
      userLocation,
      context
    );

    console.log("✨ [triggerRecalc] 재랭킹 완료:", ranked.length, "개");

    // 🔥 GENIUS_UPDATED 이벤트 발송
    window.dispatchEvent(
      new CustomEvent("GENIUS_UPDATED", {
        detail: {
          places: ranked,
          profile,
        },
      })
    );

    // 🔥 GENIUS_HIGHLIGHT 이벤트 발송 (홈 문장 생성용)
    const top3Names = ranked.slice(0, 3).map(p => p.name || "").filter(Boolean);
    if (top3Names.length > 0) {
      // 🔥 타입 변환
      const intentForEvent = profile.todayIntent === "watch" ? "watch" :
                            profile.todayIntent === "exercise" ? "play" :
                            profile.todayIntent === "play" ? "chill" : "watch";
      const companyForEvent = profile.context === "alone" ? "solo" :
                              profile.context === "friends" ? "friends" :
                              profile.context === "partner" ? "date" : "family";
      const moodForEvent = profile.mood === "quiet" ? "calm" :
                          profile.mood === "excited" ? "excited" :
                          profile.mood === "focused" ? "focus" : "light";

      window.dispatchEvent(
        new CustomEvent("GENIUS_HIGHLIGHT", {
          detail: {
            placeIds: ranked.slice(0, 3).map(p => p.id),
            placeNames: top3Names,
            intent: intentForEvent,
            company: companyForEvent,
            mood: moodForEvent,
          },
        })
      );
    }
  } catch (error) {
    console.error("❌ [triggerRecalc] 재랭킹 실패:", error);
  }
}
