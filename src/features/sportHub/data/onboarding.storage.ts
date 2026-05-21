/**
 * 🔥 Onboarding Storage - 온보딩 상태 저장
 * 
 * localStorage 기반 영구 저장
 */

import type { OnboardingState } from "../domain/onboarding.types";

const STORAGE_KEY = "sporthub_onboarding";

/**
 * 온보딩 상태 저장
 */
export function saveOnboardingState(state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[OnboardingStorage] 저장 실패:", error);
  }
}

/**
 * 온보딩 상태 로드
 */
export function loadOnboardingState(): OnboardingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 온보딩 상태 초기화
 */
export function clearOnboardingState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}
