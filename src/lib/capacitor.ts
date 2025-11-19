/**
 * 🔋 Capacitor 유틸리티
 * 
 * 웹 환경과 모바일 앱 환경을 자동으로 감지하고 적절한 API를 사용합니다.
 * 
 * ⚠️ 중요: window.Capacitor를 체크하여 웹 빌드 오류를 방지합니다.
 */

// Capacitor 존재 여부를 런타임에서 확인 (웹 빌드 오류 방지)
let _isCapacitor: boolean | null = null;
let _platform: string | null = null;

/**
 * Capacitor 정보 확인 (window.Capacitor 체크)
 */
function checkCapacitor() {
  if (_isCapacitor !== null) {
    return { isCapacitor: _isCapacitor, platform: _platform || 'web' };
  }

  // window.Capacitor가 있는지 확인 (모바일 앱 환경에서만 존재)
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
    _isCapacitor = true;
    _platform = window.Capacitor.getPlatform();
    return { isCapacitor: true, platform: _platform };
  }

  // 웹 환경
  _isCapacitor = false;
  _platform = 'web';
  return { isCapacitor: false, platform: 'web' };
}

/**
 * Capacitor 초기화 여부 확인 (동기 함수 - window.Capacitor 체크)
 */
export const isCapacitor = (() => {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
    return true;
  }
  return false;
})();

/**
 * 현재 플랫폼 확인 (동기 함수 - window.Capacitor 체크)
 */
export const platform = (() => {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
    return window.Capacitor.getPlatform();
  }
  return 'web';
})();

/**
 * Capacitor 정보 가져오기 (동기 - window.Capacitor 체크)
 */
export function getCapacitorInfo() {
  return checkCapacitor();
}

/**
 * Android 여부 (동기 - window.Capacitor 체크)
 */
export function isAndroidAsync(): boolean {
  return checkCapacitor().platform === 'android';
}

/**
 * iOS 여부 (동기 - window.Capacitor 체크)
 */
export function isIOSAsync(): boolean {
  return checkCapacitor().platform === 'ios';
}

/**
 * 웹 환경 여부 (동기 - window.Capacitor 체크)
 */
export function isWebAsync(): boolean {
  return checkCapacitor().platform === 'web';
}

/**
 * 모바일 앱 환경 여부 (동기 - window.Capacitor 체크)
 */
export function isMobileAsync(): boolean {
  const info = checkCapacitor();
  return info.platform === 'android' || info.platform === 'ios';
}

/**
 * Android 여부 (동기 - window.Capacitor 체크)
 */
export const isAndroid = platform === 'android';

/**
 * iOS 여부 (동기 - window.Capacitor 체크)
 */
export const isIOS = platform === 'ios';

/**
 * 웹 환경 여부 (동기 - window.Capacitor 체크)
 */
export const isWeb = platform === 'web';

/**
 * 모바일 앱 환경 여부 (동기 - window.Capacitor 체크)
 */
export const isMobile = isAndroid || isIOS;

/**
 * 디바이스 정보 가져오기
 */
export async function getDeviceInfo() {
  if (!isCapacitor) {
    return {
      platform: 'web',
      model: navigator.userAgent,
      osVersion: navigator.platform,
      appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      appBuild: 'web',
    };
  }

  try {
    // window.Capacitor가 있으면 Capacitor 모듈 import 시도
    if (window.Capacitor?.isNativePlatform()) {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      const id = await Device.getId();
      
      return {
        platform: info.platform,
        model: info.model,
        osVersion: info.osVersion,
        appVersion: info.appVersion || import.meta.env.VITE_APP_VERSION || '1.0.0',
        appBuild: info.appBuild || '1.0.0',
        deviceId: id.identifier,
        manufacturer: info.manufacturer,
      };
    }
  } catch (error) {
    console.error('디바이스 정보 가져오기 오류:', error);
  }

  return {
    platform: 'unknown',
    model: 'unknown',
    osVersion: 'unknown',
    appVersion: '1.0.0',
    appBuild: '1.0.0',
  };
}

/**
 * 앱 종료 (모바일만)
 */
export async function appExit() {
  if (!isCapacitor || !window.Capacitor?.isNativePlatform()) {
    return;
  }

  try {
    const { App } = await import('@capacitor/app');
    await App.exitApp();
  } catch (error) {
    console.error('앱 종료 오류:', error);
  }
}

