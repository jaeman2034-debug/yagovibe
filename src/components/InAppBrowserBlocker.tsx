/**
 * 인앱 브라우저 차단 전체 화면 UI
 * 
 * 인앱 브라우저에서 접근 시 표시되는 "Chrome으로 열기" 안내 화면입니다.
 * 
 * @example
 * ```tsx
 * const { type, isInApp } = useInAppBrowser();
 * 
 * if (isInApp) {
 *   return <InAppBrowserBlocker type={type} canonicalUrl="https://www.yagovibe.com/login" />;
 * }
 * ```
 */

import React from 'react';
import { getInAppBrowserMessage, type InAppBrowserType } from '@/utils/inAppBrowser';
import { openExternalBrowser } from '@/utils/openExternalBrowser';

interface InAppBrowserBlockerProps {
  /** 감지된 인앱 브라우저 타입 */
  type: InAppBrowserType;
  /** 리다이렉트할 정규 URL (기본값: 현재 페이지 URL) */
  canonicalUrl?: string;
  /** iOS에서 Safari로 열기 여부 (기본값: true) */
  useSafariOnIOS?: boolean;
}

const InAppBrowserBlocker: React.FC<InAppBrowserBlockerProps> = ({
  type,
  canonicalUrl,
  useSafariOnIOS = true,
}) => {
  // 🔥 안전한 초기화
  let targetUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : 'https://www.yagovibe.com');
  let isIOS = false;
  let browserName = 'Chrome(크롬) 또는 기본 브라우저';
  let message = '앱 안의 브라우저에서는\nGoogle 로그인이 제대로 동작하지 않아요.';
  let appName = '앱 내 브라우저';
  
  try {
    // iOS 감지
    if (typeof navigator !== 'undefined') {
      isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    }
    
    // 브라우저 이름 결정
    browserName = isIOS && useSafariOnIOS ? 'Safari' : 'Chrome(크롬) 또는 기본 브라우저';
    
    // 안내 메시지
    message = getInAppBrowserMessage(type);
    
    // ⚠️ getInAppBrowserName 호출 제거 (React 내부에서 브라우저 판별 함수 사용 금지)
    // ✅ User Agent 기반으로 직접 브라우저 이름 결정
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    if (/kakaotalk/i.test(userAgent)) {
      appName = '카카오톡';
    } else if (/naver/i.test(userAgent)) {
      appName = '네이버';
    } else if (/daum/i.test(userAgent)) {
      appName = '다음';
    } else {
      appName = '인앱 브라우저';
    }
  } catch (error) {
    console.error('❌ [InAppBrowserBlocker] 초기화 중 에러:', error);
    // 에러 발생 시 기본값 사용
  }

  /**
   * 외부 브라우저로 열기
   * 
   * hidden iframe trick을 사용하여 Android에서 Chrome을 실행합니다.
   * fallback 시간은 1000ms (800~1200ms 권장 범위 내)로 설정됩니다.
   */
  const handleOpenExternal = () => {
    try {
      // 🔥 openExternalBrowser 유틸리티 사용 (hidden iframe trick 포함)
      // fallbackDelay: 1000ms (800~1200ms 권장 범위 내)
      openExternalBrowser(targetUrl, {
        fallbackDelay: 1000,
        useSafariOnIOS: useSafariOnIOS,
      });
    } catch (error) {
      console.error('❌ [InAppBrowserBlocker] 외부 브라우저 열기 실패:', error);
      // 실패 시 일반 URL로 폴백
      window.location.href = targetUrl;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: '#fff7f2',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* 🔥 메인 메시지 */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 700,
          marginBottom: '16px',
          whiteSpace: 'pre-line',
          color: '#1a1a1a',
          lineHeight: '1.6',
        }}
      >
        {message}
      </div>

      {/* 🔥 부가 설명 */}
      <div 
        style={{ 
          fontSize: '14px', 
          color: '#666', 
          marginBottom: '32px',
          lineHeight: '1.5',
        }}
      >
        아래 버튼을 눌러 <strong>{browserName}</strong>에서 다시 열어주세요.
      </div>

      {/* 🔥 Chrome/Safari로 열기 버튼 */}
      <button
        onClick={handleOpenExternal}
        style={{
          padding: '14px 24px',
          borderRadius: '999px',
          border: 'none',
          background: '#ff6b00',
          color: 'white',
          fontSize: '16px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#ff8533';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.16)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ff6b00';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        }}
      >
        {browserName}로 열기
      </button>

      {/* 🔥 대체 방법 안내 */}
      <div 
        style={{ 
          marginTop: '24px', 
          fontSize: '12px', 
          color: '#999',
          lineHeight: '1.5',
        }}
      >
        또는 주소창에 직접 입력:{' '}
        <span 
          style={{ 
            fontWeight: 600,
            color: '#666',
            wordBreak: 'break-all',
          }}
        >
          {targetUrl}
        </span>
      </div>

      {/* 🔥 추가 안내 (선택적) */}
      {type !== 'none' && (
        <div 
          style={{ 
            marginTop: '16px', 
            fontSize: '11px', 
            color: '#aaa',
            maxWidth: '400px',
          }}
        >
          💡 {appName}에서 링크를 길게 눌러 "브라우저에서 열기"를 선택해도 됩니다.
        </div>
      )}
    </div>
  );
};

export default InAppBrowserBlocker;

