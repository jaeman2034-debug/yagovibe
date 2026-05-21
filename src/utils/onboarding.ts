/**
 * 🔥 Onboarding - 첫 방문 감지 (Phase 13)
 * 
 * 책임 범위:
 * ✅ 첫 방문 여부 확인
 * ✅ 온보딩 완료 상태 관리
 */

const ONBOARDING_KEY = 'yago:onboarding:completed';
const MAP_INTRO_KEY = 'yago:mapIntro:seen'; // 🔥 Phase 15: 지도 안내 표시 여부

/**
 * 첫 방문 여부 확인
 */
export function isFirstVisit(): boolean {
  try {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    return !completed;
  } catch (error) {
    console.warn('[Onboarding] 첫 방문 확인 실패:', error);
    return true; // 안전하게 첫 방문으로 간주
  }
}

/**
 * 온보딩 완료 처리
 */
export function completeOnboarding(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    console.log('[Onboarding] 온보딩 완료');
  } catch (error) {
    console.warn('[Onboarding] 온보딩 완료 처리 실패:', error);
  }
}

/**
 * 🔥 Phase 15: 지도 안내 표시 여부 확인
 */
export function hasSeenMapIntro(): boolean {
  try {
    return localStorage.getItem(MAP_INTRO_KEY) === 'seen';
  } catch (error) {
    console.warn('[Onboarding] 지도 안내 확인 실패:', error);
    return false;
  }
}

/**
 * 🔥 Phase 15: 지도 안내 표시 완료 처리
 */
export function markMapIntroSeen(): void {
  try {
    localStorage.setItem(MAP_INTRO_KEY, 'seen');
    console.log('[Onboarding] 지도 안내 표시 완료');
  } catch (error) {
    console.warn('[Onboarding] 지도 안내 표시 완료 처리 실패:', error);
  }
}
