/**
 * 🔥 Device detection utilities
 * 모바일 감지 및 테마 정책 유틸
 */

/**
 * 모바일 디바이스 감지
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 카카오 인앱 브라우저 감지
 */
export function isKakaoInApp(): boolean {
  if (typeof window === 'undefined') return false;
  return /KAKAOTALK/i.test(navigator.userAgent);
}

/**
 * 모바일에서 라이트 모드 강제 여부 판단
 * - 카카오 인앱 / 모바일 → 항상 라이트 강제
 */
export function shouldForceLightMode(): boolean {
  return isMobileDevice() || isKakaoInApp();
}

/**
 * 모바일에서는 dark: 클래스를 제거하고 라이트 클래스만 반환
 * 데스크탑에서는 원래 클래스 반환
 */
export function getMobileSafeClassName(lightClass: string, darkClass?: string): string {
  if (shouldForceLightMode()) {
    return lightClass;
  }
  return darkClass ? `${lightClass} ${darkClass}` : lightClass;
}

