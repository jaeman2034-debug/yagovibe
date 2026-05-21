/**
 * 인앱 브라우저 감지 유틸리티
 * 
 * 카카오톡, 인스타그램, 페이스북, 네이버, 라인 등 인앱 브라우저를 감지하고
 * 일반 브라우저(Chrome, Safari, Edge, Firefox)와 구분합니다.
 */

export type InAppBrowserType =
  | 'kakao'
  | 'instagram'
  | 'facebook'
  | 'line'
  | 'naver'
  | 'daum'
  | 'band'
  | 'whale'
  | 'samsungbrowser'
  | 'generic-webview'
  | 'none';

/**
 * User Agent를 분석하여 인앱 브라우저 타입을 감지합니다.
 * 
 * @param uaRaw - 분석할 User Agent 문자열 (기본값: navigator.userAgent)
 * @returns 감지된 인앱 브라우저 타입
 * 
 * @example
 * ```typescript
 * const type = detectInAppBrowser();
 * if (type === 'kakao') {
 *   // 카카오톡 인앱 브라우저 처리
 * }
 * ```
 */
// 🔥 모바일에서 안전하게 export (명시적 export)
export function detectInAppBrowser(uaRaw?: string): InAppBrowserType {
  // 🔥 안전한 환경 체크 (모바일 대응 강화)
  try {
    if (typeof window === 'undefined') {
      return 'none';
    }
    
    // 🔥 navigator가 없거나 userAgent가 없으면 안전하게 처리
    if (typeof navigator === 'undefined' || !navigator.userAgent) {
      console.warn('⚠️ [inAppBrowser.ts] navigator.userAgent를 사용할 수 없습니다.');
      return 'none';
    }
  } catch (error) {
    console.error('❌ [inAppBrowser.ts] 환경 체크 중 에러:', error);
    return 'none';
  }

  try {
    // 🔥 모바일에서 안전하게 userAgent 접근
    const userAgent = uaRaw || (navigator.userAgent || '');
    if (!userAgent) {
      return 'none';
    }
    const ua = userAgent.toLowerCase();

  // 🔥 특정 인앱 브라우저 감지 (우선순위 순)
  // ⚠️ 일반 브라우저(Edge, Chrome, Safari, Firefox)는 아래에서 필터링되므로 여기서는 특정 인앱 브라우저만 감지
  
  // 🔥 카카오톡 감지 강화 (다양한 패턴 추가)
  if (ua.includes('kakaotalk') || 
      ua.includes('kakaotalk/') ||
      ua.includes('kakao') && (ua.includes('inapp') || ua.includes('wv'))) {
    return 'kakao';
  }
  
  if (ua.includes('instagram')) return 'instagram';
  if (ua.includes('fb_iab') || ua.includes('fb4a') || ua.includes('facebook')) return 'facebook';
  if (ua.includes('line/')) return 'line';
  if (ua.includes('naver(inapp)') || (ua.includes('naver') && ua.includes('wv'))) return 'naver';
  if (ua.includes('daum')) return 'daum';
  if (ua.includes('band')) return 'band';
  if (ua.includes('whale')) return 'whale';
  if (ua.includes('samsungbrowser')) return 'samsungbrowser';

  // 🔥 일반 브라우저 감지 (인앱 브라우저가 아닌 경우) - 우선순위: Edge > Chrome > Safari > Firefox
  // Edge: 'edg' 또는 'edg/' 포함 (모바일 Edge도 'edg/' 포함하므로 모두 포함)
  // ⚠️ Edge는 Chrome보다 먼저 체크해야 함 (Edge User Agent에 'chrome'도 포함됨)
  const isEdge = ua.includes('edg') || ua.includes('edg/');
  
  // Chrome: 'chrome' 포함하되 Edge, Opera, WebView, 인앱 브라우저 제외
  const isChrome = !isEdge && // 🔥 Edge가 아닌 경우에만 Chrome 체크
                   ua.includes('chrome') && 
                   !ua.includes('opr') && 
                   !ua.includes('wv') &&
                   !ua.includes('kakaotalk') &&
                   !ua.includes('instagram') &&
                   !ua.includes('naver') &&
                   !ua.includes('fb') &&
                   !ua.includes('facebook') &&
                   !ua.includes('line') &&
                   !ua.includes('daum') &&
                   !ua.includes('band') &&
                   !ua.includes('whale') &&
                   !ua.includes('samsungbrowser');
  
  // Safari: 'safari' 포함하되 Chrome, Edge, WebView, Chrome iOS 제외
  const isSafari = !isEdge && // 🔥 Edge가 아닌 경우에만 Safari 체크
                   ua.includes('safari') && 
                   !ua.includes('chrome') && 
                   !ua.includes('wv') &&
                   !ua.includes('crios');
  
  // Firefox: 'firefox' 포함하되 Firefox iOS 제외
  const isFirefox = ua.includes('firefox') && !ua.includes('fxios');

  // 일반 브라우저는 'none' 반환
  if (isChrome || isEdge || isSafari || isFirefox) {
    // 🔍 디버깅: 일반 브라우저 감지 로그
    console.log('✅ [inAppBrowser.ts] 일반 브라우저 감지:', {
      isChrome,
      isEdge,
      isSafari,
      isFirefox,
      userAgent: userAgent.substring(0, 100),
    });
    return 'none';
  }

  // 🔥 Generic WebView 감지 (Android/iOS) - 더 엄격하게
  // ⚠️ 일반 모바일 브라우저는 이미 위에서 'none'으로 반환되므로 여기서는 진짜 WebView만 감지
  const isAndroid = ua.includes('android');
  const isIOS = /iphone|ipad|ipod/.test(ua);
  
  // Android WebView: 'wv' 포함하되 Chrome이 아니고, 일반 브라우저가 아닌 경우만
  // 일반 브라우저는 이미 위에서 필터링되었으므로 여기서는 진짜 WebView만 감지
  const isAndroidWebView = isAndroid && 
                           ua.includes('wv') && 
                           !ua.includes('chrome') &&
                           !isChrome && 
                           !isEdge && 
                           !isSafari && 
                           !isFirefox;
  
  // iOS WebView: Safari가 아니고, Chrome iOS가 아니고, 일반 브라우저가 아닌 WebKit만
  // 일반 브라우저는 이미 위에서 필터링되었으므로 여기서는 진짜 WebView만 감지
  const isIOSWebView = isIOS && 
                       ua.includes('applewebkit') && 
                       !ua.includes('safari') &&
                       !ua.includes('crios') &&
                       !isChrome && 
                       !isEdge && 
                       !isSafari && 
                       !isFirefox;

    if (isAndroidWebView || isIOSWebView) {
      return 'generic-webview';
    }

    return 'none';
  } catch (error) {
    console.error('❌ [inAppBrowser.ts] detectInAppBrowser 실행 중 에러:', error);
    // 에러 발생 시 일반 브라우저로 간주
    return 'none';
  }
}

// 🔥 모바일에서 안전하게 접근할 수 있도록 default export도 추가
export default detectInAppBrowser;

// 🔥 전역 fallback 추가 (모바일 빌드에서 함수가 로드되지 않을 경우 대비)
// ⚠️ index.html에서 이미 전역 함수가 정의되어 있으므로, 중복 등록 방지
// ✅ 전역 함수가 없을 때만 등록 (충돌 방지)
// ✅ 즉시 실행하여 함수가 가능한 한 빨리 사용 가능하도록 보장
if (typeof window !== 'undefined') {
  try {
    // 전역 함수가 이미 정의되어 있으면 등록하지 않음 (index.html에서 정의됨)
    if (typeof (window as any).detectInAppBrowser !== 'function') {
      // window 객체에 함수를 등록하여 전역에서 접근 가능하도록 함 (최종 fallback)
      (window as any).detectInAppBrowser = detectInAppBrowser;
      console.log('✅ [inAppBrowser.ts] detectInAppBrowser 전역 fallback 등록 완료 (index.html에 없을 경우)');
    } else {
      console.log('✅ [inAppBrowser.ts] detectInAppBrowser 전역 함수 이미 존재 (index.html에서 정의됨)');
    }
  } catch (error) {
    console.error('❌ [inAppBrowser.ts] 전역 fallback 등록 실패:', error);
    // 에러 발생 시에도 최소한의 fallback 함수 제공
    try {
      (window as any).detectInAppBrowser = function() { return 'none'; };
    } catch (e) {
      // window에 접근할 수 없는 경우 무시
    }
  }
} else {
  // window가 없는 환경에서는 아무것도 하지 않음
  console.warn('⚠️ [inAppBrowser.ts] window 객체가 없습니다. 전역 fallback 등록 불가.');
}

/**
 * 인앱 브라우저인지 여부를 반환합니다.
 * 
 * @param uaRaw - 분석할 User Agent 문자열 (기본값: navigator.userAgent)
 * @returns 인앱 브라우저이면 true, 일반 브라우저이면 false
 * 
 * @example
 * ```typescript
 * if (isInAppBrowser()) {
 *   // 인앱 브라우저 처리
 * }
 * ```
 */
export function isInAppBrowser(uaRaw?: string): boolean {
  return detectInAppBrowser(uaRaw) !== 'none';
}

/**
 * 인앱 브라우저 타입에 따른 사용자 친화적 이름을 반환합니다.
 * 
 * @param type - 인앱 브라우저 타입
 * @returns 브라우저 이름
 */
export function getInAppBrowserName(type: InAppBrowserType): string {
  const names: Record<InAppBrowserType, string> = {
    'kakao': '카카오톡',
    'instagram': '인스타그램',
    'facebook': '페이스북',
    'line': '라인',
    'naver': '네이버',
    'daum': '다음',
    'band': '밴드',
    'whale': '네이버 웨일',
    'samsungbrowser': '삼성 인터넷',
    'generic-webview': '앱 내 브라우저',
    'none': '일반 브라우저',
  };
  return names[type] || '앱 내 브라우저';
}

/**
 * 인앱 브라우저 타입에 따른 안내 메시지를 반환합니다.
 * 
 * @param type - 인앱 브라우저 타입
 * @returns 안내 메시지
 */
export function getInAppBrowserMessage(type: InAppBrowserType): string {
  if (type === 'kakao') {
    return '카카오톡 인앱 브라우저에서는\nGoogle 로그인이 제대로 동작하지 않아요.';
  }
  if (type === 'none') {
    return '';
  }
  return '앱 안의 브라우저에서는\nGoogle 로그인이 제대로 동작하지 않아요.';
}

