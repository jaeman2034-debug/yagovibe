/**
 * Universal Link 페이지 (단순화 버전)
 * 
 * 카카오톡 인앱 브라우저에서는 intent://를 시도하지 않고 바로 홈으로 이동합니다.
 * 일반 Android 브라우저에서만 intent://를 시도합니다.
 * 
 * 사용법:
 * - 카카오톡 링크: https://yagovibe.com/launch?redirect=chrome
 * - 일반 Android 브라우저: Intent URL 시도
 * - 카카오톡 인앱: 즉시 홈(/)으로 이동
 */

import { useEffect } from 'react';

function isKakaoInApp() {
  const ua = navigator.userAgent || '';
  return /KAKAOTALK/i.test(ua);
}

const LaunchPage: React.FC = () => {
  useEffect(() => {
    const nowUrl = window.location.href;
    
    console.log('🚀 [LaunchPage] 컴포넌트 마운트됨:', {
      pathname: window.location.pathname,
      search: window.location.search,
      userAgent: navigator.userAgent.substring(0, 100)
    });

    // 1) 카카오 인앱이면: 자동 intent 시도하지 말고 그냥 홈으로
    if (isKakaoInApp()) {
      console.log('⚠️ [LaunchPage] 카카오톡 인앱 감지 → Intent URL 포기, 홈(/)으로 이동');
      // 여기서 굳이 외부 브라우저로 강제 안 보내고
      // 일단 서비스 홈으로만 탈출시키자
      window.location.replace('/');
      return;
    }

    // 2) 일반 모바일 브라우저: Intent URL 시도하지 않고 바로 홈으로
    // ⚠️ Intent URL은 카카오톡 인앱 브라우저에서만 필요합니다.
    // 일반 모바일 브라우저에서는 이미 외부 브라우저이므로 Intent URL이 필요 없습니다.
    const isAndroid = /Android/.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // 일반 모바일 브라우저: 즉시 홈으로 이동
    if (isAndroid || isIOS) {
      console.log('⚠️ [LaunchPage] 일반 모바일 브라우저 감지 → Intent URL 시도 안 함, 홈으로 이동');
      window.location.replace('/');
      return;
    }

    // 기타 플랫폼: 즉시 홈으로
    console.log('⚠️ [LaunchPage] 기타 플랫폼 → 홈으로 리디렉션');
    window.location.replace('/');
  }, []);

  // 로딩 화면 표시 (리디렉션 중)
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        background: '#fff7f2',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <p
        style={{
          fontSize: '18px',
          fontWeight: 700,
          marginBottom: '8px',
          color: '#1a1a1a',
        }}
      >
        외부 브라우저로 이동 중...
      </p>
      <p
        style={{
          marginTop: 8,
          fontSize: 12,
          color: '#666',
        }}
      >
        잠시만 기다려주세요.
      </p>
    </div>
  );
};

export default LaunchPage;
