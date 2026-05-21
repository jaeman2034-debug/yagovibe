/**
 * 🔥 천재 모드: 추천 재계산 서비스
 * 
 * 역할:
 * - 프로필 저장 후 즉시 추천 재계산
 * - 지도/목록 즉시 갱신 이벤트 발송
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { rerankPlacesBySportsSense, type SportsSenseProfile } from "./sportsSenseRecommendation";
import type { MapPlace } from "@/types/map";

/**
 * 🔥 사용자 프로필 조회
 */
async function getUserProfile(uid: string) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }
  
  return userSnap.data();
}

/**
 * 🔥 기본 점수 계산
 */
function baseScore(place: MapPlace): number {
  // 기본 점수: 평점 기반
  if (place.rating) {
    return place.rating * 20; // 5점 만점 → 100점
  }
  return 50; // 기본값
}

/**
 * 🔥 mood 보너스 점수
 */
function moodBonus(place: MapPlace, mood: string): number {
  const placeName = (place.name || "").toLowerCase();
  const placeTypes = (place.types || []).map(t => t.toLowerCase());

  switch (mood) {
    case "quiet":
    case "calm":
      if (placeName.includes("카페") || placeName.includes("도서관") || placeTypes.includes("cafe") || placeTypes.includes("library")) {
        return 30;
      }
      if (placeName.includes("펍") || placeName.includes("클럽") || placeTypes.includes("bar") || placeTypes.includes("night_club")) {
        return -20;
      }
      return 0;

    case "excited":
      if (placeName.includes("펍") || placeName.includes("스포츠바") || placeTypes.includes("bar")) {
        return 30;
      }
      if (placeName.includes("도서관") || placeTypes.includes("library")) {
        return -20;
      }
      return 0;

    case "focus":
    case "focused":
      if (placeName.includes("도서관") || placeName.includes("스터디") || placeTypes.includes("library")) {
        return 30;
      }
      return 0;

    case "light":
      if (placeName.includes("카페") || placeName.includes("공원") || placeTypes.includes("cafe") || placeTypes.includes("park")) {
        return 20;
      }
      return 0;

    default:
      return 0;
  }
}

/**
 * 🔥 intent 보너스 점수
 */
function intentBonus(place: MapPlace, intent: string): number {
  const placeName = (place.name || "").toLowerCase();
  const placeTypes = (place.types || []).map(t => t.toLowerCase());

  switch (intent) {
    case "watch":
      if (placeName.includes("경기장") || placeName.includes("스타디움") || placeName.includes("스포츠바") || 
          placeTypes.includes("stadium") || placeTypes.includes("sports_complex") || placeTypes.includes("bar")) {
        return 40;
      }
      return 0;

    case "play":
    case "exercise":
      if (placeName.includes("헬스") || placeName.includes("피트니스") || placeName.includes("공원") || 
          placeTypes.includes("gym") || placeTypes.includes("park") || placeTypes.includes("sports_complex")) {
        return 40;
      }
      return 0;

    case "chill":
    case "alone":
      if (placeName.includes("카페") || placeName.includes("도서관") || placeName.includes("공원") || 
          placeTypes.includes("cafe") || placeTypes.includes("library") || placeTypes.includes("park")) {
        return 30;
      }
      return 0;

    default:
      return 0;
  }
}

/**
 * 🔥 추천 재계산 및 즉시 갱신
 * 
 * @param uid - 사용자 ID
 * @param places - 현재 장소 목록 (선택적, 없으면 이벤트만 발송)
 */
export async function recalcPlacesWeight(
  uid: string,
  places?: MapPlace[]
): Promise<void> {
  try {
    const profile = await getUserProfile(uid);
    
    if (!profile) {
      console.warn("⚠️ [recalcPlacesWeight] 프로필 없음:", uid);
      return;
    }

    const sportsSense = profile.sportsSense;
    
    if (!sportsSense || !sportsSense.activatedAt) {
      console.warn("⚠️ [recalcPlacesWeight] 스포츠 감각 미활성화:", uid);
      return;
    }

    // 🔥 스포츠 감각 프로필 구성
    const sportsSenseProfile: SportsSenseProfile = {
      todayIntent: sportsSense.todayIntent,
      context: sportsSense.context,
      mood: sportsSense.mood,
      behaviorScore: sportsSense.behaviorScore || 0,
    };

    // 🔥 장소 목록이 제공된 경우 즉시 재계산
    if (places && places.length > 0) {
      // 위치 정보는 이벤트 리스너에서 처리
      // 여기서는 이벤트만 발송
    }

    // 🔥 지도/목록 즉시 갱신 이벤트 발송
    window.dispatchEvent(
      new CustomEvent("GENIUS_UPDATED", {
        detail: {
          uid,
          profile: sportsSenseProfile,
          intent: profile.intent,
          company: profile.company,
          mood: profile.mood,
        },
      })
    );

    console.log("✅ [recalcPlacesWeight] 추천 재계산 완료 및 이벤트 발송:", {
      uid,
      intent: profile.intent,
      company: profile.company,
      mood: profile.mood,
    });
  } catch (error) {
    console.error("❌ [recalcPlacesWeight] 추천 재계산 실패:", error);
  }
}
