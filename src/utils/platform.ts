/**
 * 🔥 Phase 18: 플랫폼 감지 유틸리티
 * 
 * Web과 Mobile(Expo) 환경을 구분
 */

export type Platform = 'web' | 'ios' | 'android' | 'unknown';

/**
 * 현재 플랫폼 감지
 * 
 * Web: 브라우저 환경
 * iOS/Android: React Native 환경 (Expo)
 */
export function detectPlatform(): Platform {
  // React Native 환경 체크
  if (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative') {
    // Expo 환경에서 Platform API 사용 가능
    try {
      // @ts-ignore - React Native 환경에서만 존재
      const { Platform: RNPlatform } = require('react-native');
      if (RNPlatform.OS === 'ios') return 'ios';
      if (RNPlatform.OS === 'android') return 'android';
    } catch {
      // React Native 모듈이 없으면 웹 환경
    }
  }

  // 웹 환경
  if (typeof window !== 'undefined') {
    return 'web';
  }

  return 'unknown';
}

/**
 * 웹 환경 여부
 */
export function isWeb(): boolean {
  return detectPlatform() === 'web';
}

/**
 * 모바일 환경 여부 (iOS 또는 Android)
 */
export function isMobile(): boolean {
  const platform = detectPlatform();
  return platform === 'ios' || platform === 'android';
}
