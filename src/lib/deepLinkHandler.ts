/**
 * 🔥 STEP 2: 모바일 딥링크 처리
 * 
 * Capacitor App에서 딥링크를 받아서 QR 라우터로 전달
 * - yagovibe://qr?market=home
 * - https://yagovibe.com/qr?item=123
 * - https://www.yagovibe.com/qr?chat=abc
 */

import { handleQREntry } from './qrRouter';

/**
 * 딥링크 URL을 파싱하여 경로 추출
 */
function parseDeepLinkUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // yagovibe:// 스킴 처리
    if (urlObj.protocol === 'yagovibe:') {
      // yagovibe://qr?market=home → /qr?market=home
      const path = urlObj.pathname + urlObj.search;
      return path.startsWith('/') ? path : `/${path}`;
    }
    
    // https://yagovibe.com 스킴 처리
    if (urlObj.protocol === 'https:' && 
        (urlObj.hostname === 'yagovibe.com' || urlObj.hostname === 'www.yagovibe.com')) {
      // https://yagovibe.com/qr?market=home → /qr?market=home
      return urlObj.pathname + urlObj.search;
    }
    
    return null;
  } catch (error) {
    console.error('❌ [deepLinkHandler] URL 파싱 실패:', error);
    return null;
  }
}

/**
 * 딥링크 처리 및 라우팅
 */
export async function handleDeepLink(url: string): Promise<string | null> {
  console.log('🔗 [deepLinkHandler] 딥링크 수신:', url);
  
  const path = parseDeepLinkUrl(url);
  if (!path) {
    console.warn('⚠️ [deepLinkHandler] 유효하지 않은 딥링크 URL:', url);
    return null;
  }
  
  // QR 파라미터가 있는 경우 QR 라우터로 처리
  if (path.startsWith('/qr')) {
    const searchParams = new URLSearchParams(path.split('?')[1] || '');
    const destination = handleQREntry(searchParams);
    
    if (destination) {
      console.log('✅ [deepLinkHandler] QR 딥링크 처리:', path, '→', destination);
      return destination;
    }
  }
  
  // 일반 경로는 그대로 반환
  console.log('✅ [deepLinkHandler] 일반 딥링크 처리:', path);
  return path;
}

/**
 * Capacitor App 딥링크 리스너 등록
 */
export function setupDeepLinkListener(
  onDeepLink: (url: string) => void
): () => void {
  console.log('🔗 [deepLinkHandler] 딥링크 리스너 등록');

  // 웹 환경에서는 Capacitor 미사용 (빌드/런타임 안전)
  if (typeof window === 'undefined' || !(window as any).Capacitor) {
    return () => {
      console.log('🔗 [deepLinkHandler] 웹 환경: 딥링크 리스너 없음');
    };
  }

  let removed = false;
  let listener: { remove: () => Promise<void> } | null = null;

  // Capacitor 모듈은 런타임에만 동적 import
  const capacitorAppModule = '@capacitor/app';
  import(/* @vite-ignore */ capacitorAppModule)
    .then(({ App }) => {
      if (removed) return;

      // 앱이 열려있을 때 딥링크 수신
      listener = App.addListener('appUrlOpen', async (event: { url: string }) => {
        console.log('🔗 [deepLinkHandler] appUrlOpen 이벤트:', event.url);
        const destination = await handleDeepLink(event.url);
        if (destination) {
          onDeepLink(destination);
        }
      });

      // 앱 시작 시 딥링크 확인
      App.getLaunchUrl()
        .then((result) => {
          if (result?.url) {
            console.log('🔗 [deepLinkHandler] 앱 시작 시 딥링크:', result.url);
            handleDeepLink(result.url).then((destination) => {
              if (destination) {
                onDeepLink(destination);
              }
            });
          }
        })
        .catch(() => {
          // 딥링크가 없으면 무시
        });
    })
    .catch(() => {
      console.log('🔗 [deepLinkHandler] Capacitor 미탑재 환경');
    });

  // 리스너 제거 함수 반환
  return () => {
    removed = true;
    if (listener) {
      listener.remove().catch(() => {});
    }
    console.log('🔗 [deepLinkHandler] 딥링크 리스너 제거');
  };
}
