/**
 * 외부 브라우저로 강제 리디렉션 유틸리티
 * 
 * 인앱 브라우저(카카오톡, 인스타그램 등)에서 외부 브라우저(Chrome, Safari)로
 * 강제로 리디렉션하는 기능을 제공합니다.
 * 
 * Android에서는 hidden iframe trick을 사용하여 Intent 스킴을 실행합니다.
 * iOS에서는 단순 URL 리디렉션을 사용합니다.
 * 
 * @example
 * ```typescript
 * import { openExternalBrowser } from '@/utils/openExternalBrowser';
 * 
 * if (isInAppBrowser()) {
 *   openExternalBrowser(window.location.href);
 * }
 * ```
 */

/**
 * Android에서 Chrome을 실행하기 위한 hidden iframe trick
 * 
 * Android는 intent:// 스킴을 iframe에서 실행할 때 작동합니다.
 * 
 * @param url - 리디렉션할 URL
 * @param fallbackDelay - Intent 스킴 실패 시 fallback 실행 지연 시간 (ms, 기본값: 1000)
 */
function openChromeIntent(url: string, fallbackDelay: number = 1000): void {
  try {
    // URL에서 프로토콜 제거
    const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
    
    // 🔥 Fallback URL: /home으로 설정 (React Router 404 방지)
    const fallbackUrl = typeof window !== 'undefined' 
      ? window.location.origin + '/home'
      : 'https://www.yagovibe.com/home';
    
    // 🔥 Intent 스킴 URL 생성 (#Intent → ?Intent로 변경, 카카오톡 fragment 제거 문제 해결)
    // 형식: intent://www.yagovibe.com/?Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=…/home;end
    const intentUrl = 
      `intent://${urlWithoutProtocol}/?Intent;scheme=https;package=com.android.chrome;` +
      `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
    
    console.log('🚨 [openExternalBrowser] Android Chrome 실행 (?Intent, fallback=/home):', {
      intentUrl,
      fallbackUrl
    });
    
    // Hidden iframe 생성
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = intentUrl;
    
    // body에 추가
    document.body.appendChild(iframe);
    
    // fallback 지연 시간 후 iframe 제거 및 fallback URL로 리디렉션
    setTimeout(() => {
      try {
        // iframe 제거
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      } catch (e) {
        // iframe이 이미 제거되었을 수 있음
        console.warn('⚠️ [openExternalBrowser] iframe 제거 중 오류 (무시 가능):', e);
      }
      
      // Intent 스킴 실패 시 fallback: /home으로 리디렉션 (React Router 404 방지)
      // ⚠️ 현재 페이지가 여전히 인앱 브라우저인 경우에만 fallback 실행
      if (window.location.href === url || window.location.href.startsWith(url.split('?')[0])) {
        console.warn('⚠️ [openExternalBrowser] Intent 스킴 실패 (fallback) → /home으로 리디렉션');
        window.location.href = fallbackUrl;
      }
    }, fallbackDelay);
  } catch (e) {
    console.error('❌ [openExternalBrowser] iframe Intent 스킴 오류:', e);
    // 오류 발생 시 즉시 /home으로 리디렉션 (React Router 404 방지)
    const fallbackUrl = typeof window !== 'undefined' 
      ? window.location.origin + '/home'
      : 'https://www.yagovibe.com/home';
    window.location.href = fallbackUrl;
  }
}

/**
 * 외부 브라우저로 강제 리디렉션
 * 
 * 플랫폼에 따라 적절한 방법으로 외부 브라우저를 실행합니다:
 * - Android: hidden iframe trick을 사용한 Intent 스킴
 * - iOS: 단순 URL 리디렉션 (Safari로 이동)
 * - 기타: 일반 URL 리디렉션
 * 
 * @param url - 리디렉션할 URL (기본값: 현재 페이지 URL)
 * @param options - 옵션 설정
 * @param options.fallbackDelay - Android Intent 스킴 실패 시 fallback 실행 지연 시간 (ms, 기본값: 1000)
 * @param options.useSafariOnIOS - iOS에서 Safari로 열기 여부 (기본값: true)
 * 
 * @example
 * ```typescript
 * // 현재 페이지를 외부 브라우저로 열기
 * openExternalBrowser();
 * 
 * // 특정 URL을 외부 브라우저로 열기
 * openExternalBrowser('https://www.yagovibe.com/login');
 * 
 * // fallback 지연 시간 조정
 * openExternalBrowser('https://www.yagovibe.com/login', { fallbackDelay: 1200 });
 * ```
 */
export function openExternalBrowser(
  url?: string,
  options?: {
    fallbackDelay?: number;
    useSafariOnIOS?: boolean;
  }
): void {
  try {
    // URL 기본값: 현재 페이지 URL
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://www.yagovibe.com');
    
    // 옵션 기본값
    const fallbackDelay = options?.fallbackDelay ?? 1000; // 800~1200ms 권장
    const useSafariOnIOS = options?.useSafariOnIOS ?? true;
    
    // 플랫폼 감지
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isAndroid = /Android/.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    if (isAndroid) {
      // Android: hidden iframe trick 사용
      openChromeIntent(targetUrl, fallbackDelay);
    } else if (isIOS && useSafariOnIOS) {
      // iOS: 단순 URL 리디렉션 (Safari로 이동)
      console.log('🚨 [openExternalBrowser] iOS 감지 → Safari로 이동');
      window.location.href = targetUrl;
    } else {
      // 기타: 일반 리디렉션
      console.log('🚨 [openExternalBrowser] 기타 플랫폼 → 외부 브라우저로 이동');
      window.location.href = targetUrl;
    }
  } catch (e) {
    console.error('❌ [openExternalBrowser] 외부 브라우저 이동 오류:', e);
    // 오류 발생 시 일반 URL로 리디렉션
    if (typeof window !== 'undefined') {
      const targetUrl = url || window.location.href;
      window.location.href = targetUrl;
    }
  }
}

/**
 * 외부 브라우저로 강제 리디렉션 (동기 버전)
 * 
 * `openExternalBrowser`와 동일하지만, 즉시 실행됩니다.
 * 
 * @param url - 리디렉션할 URL (기본값: 현재 페이지 URL)
 * @param options - 옵션 설정
 */
export function openExternalBrowserSync(
  url?: string,
  options?: {
    fallbackDelay?: number;
    useSafariOnIOS?: boolean;
  }
): void {
  openExternalBrowser(url, options);
}

export default openExternalBrowser;
