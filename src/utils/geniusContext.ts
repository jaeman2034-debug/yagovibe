/**
 * 🔥 천재 모드 컨텍스트 리스너 (1.2 실전 연결)
 * 
 * 역할:
 * - GENIUS_CONTEXT 이벤트 수신
 * - 프로필 업데이트
 * - 재랭킹 트리거
 */

import type { SportsSenseProfile } from "./sportsSenseRecommendation";
import { triggerRecalc } from "./triggerRecalc";

/**
 * 🔥 컨텍스트 리스너 설정
 */
export function listenContext(
  profile: SportsSenseProfile | null,
  onProfileUpdate: (profile: SportsSenseProfile) => void
) {
  const handleContext = async (event: CustomEvent) => {
    const ctx = event.detail;
    console.log("🔥 [geniusContext] GENIUS_CONTEXT 이벤트 수신:", ctx);

    if (!profile) {
      console.warn("⚠️ [geniusContext] 프로필이 없습니다.");
      return;
    }

    // 🔥 intentHint 기반 프로필 업데이트
    const nextProfile: SportsSenseProfile = {
      ...profile,
      todayIntent: ctx.intentHint || profile.todayIntent,
      // 🔥 추가 컨텍스트 정보가 있으면 업데이트
      mood: ctx.moodHint || profile.mood,
      context: ctx.contextHint || profile.context,
    };

    console.log("✨ [geniusContext] 프로필 업데이트:", nextProfile);
    onProfileUpdate(nextProfile);

    // 🔥 재랭킹 트리거
    await triggerRecalc(nextProfile);
  };

  window.addEventListener("GENIUS_CONTEXT", handleContext as EventListener);

  return () => {
    window.removeEventListener("GENIUS_CONTEXT", handleContext as EventListener);
  };
}
