/**
 * 인앱 브라우저 감지 React 훅
 * 
 * 컴포넌트에서 인앱 브라우저 타입과 여부를 쉽게 확인할 수 있습니다.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { type, isInApp } = useInAppBrowser();
 *   
 *   if (isInApp) {
 *     return <InAppBrowserBlocker type={type} />;
 *   }
 *   
 *   return <NormalContent />;
 * }
 * ```
 */

import { useEffect, useState } from 'react';
// ✅ import 방식 우선 사용 (타입 안정성 및 모듈 번들러 최적화)
import { detectInAppBrowser, type InAppBrowserType } from '@/utils/inAppBrowser';

export interface UseInAppBrowserReturn {
  /** 감지된 인앱 브라우저 타입 */
  type: InAppBrowserType;
  /** 인앱 브라우저인지 여부 */
  isInApp: boolean;
  /** 일반 브라우저인지 여부 */
  isNormalBrowser: boolean;
}

/**
 * 인앱 브라우저를 감지하는 React 훅
 * 
 * ✅ import 방식 우선 사용 (타입 안정성 및 모듈 번들러 최적화)
 * ✅ 전역 함수는 fallback으로만 사용 (index.html에서 정의됨)
 * 
 * @returns 인앱 브라우저 타입과 여부
 */
export function useInAppBrowser(): UseInAppBrowserReturn {
  // 🔥 항상 동일한 초기값으로 시작 (hooks 호출 순서 일관성 보장)
  const [type, setType] = useState<InAppBrowserType>('none');

  useEffect(() => {
    // 🔥 useEffect 내에서만 비동기적으로 감지 (훅 호출 순서는 항상 동일)
    if (typeof window === 'undefined') {
      return;
    }

    // 🔥 detectInAppBrowser 함수 선택 (우선순위: import → 전역 → 기본값)
    const getDetectFunction = (): (() => InAppBrowserType) | null => {
      // 1순위: import된 함수 사용 (타입 안정성)
      if (typeof detectInAppBrowser === 'function') {
        return detectInAppBrowser;
      }
      
      // 2순위: 전역 함수 사용 (fallback, index.html에서 정의됨)
      if (typeof (window as any).detectInAppBrowser === 'function') {
        return (window as any).detectInAppBrowser;
      }
      
      // 3순위: 함수 없음
      return null;
    };

    // 🔥 함수 확인 및 감지 실행
    const checkDetectFunction = (attempts = 0) => {
      try {
        const detectFn = getDetectFunction();
        
        if (!detectFn) {
          // 🔥 함수가 아직 로드되지 않았으면 재시도 (최대 20번, 50ms 간격)
          // ⚠️ 카카오톡 인앱 브라우저에서 로딩이 느릴 수 있으므로 재시도 횟수 증가
          if (attempts < 20) {
            setTimeout(() => checkDetectFunction(attempts + 1), 50);
            return;
          }
          
          console.warn('⚠️ [useInAppBrowser] detectInAppBrowser 함수를 찾을 수 없습니다. 기본값(none) 사용:', {
            importAvailable: typeof detectInAppBrowser === 'function',
            windowAvailable: typeof (window as any).detectInAppBrowser === 'function',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'N/A',
            attempts,
          });
          
          // 🔥 함수가 없으면 기본값 'none'으로 설정하고 종료
          // 일반 브라우저로 간주하여 정상 진행
          // ⚠️ 추가 안전장치: 전역 함수를 직접 확인하고 없으면 생성
          if (typeof (window as any).detectInAppBrowser !== 'function') {
            console.warn('⚠️ [useInAppBrowser] 전역 함수도 없음 - 기본 함수 생성');
            (window as any).detectInAppBrowser = function() { return 'none'; };
          }
          setType('none');
          return;
        }

        // 초기 감지
        const detectedType = detectFn() as InAppBrowserType;
        setType(detectedType);

        // 🔍 디버깅 정보
        const source = typeof detectInAppBrowser === 'function' 
          ? 'import (모듈 방식)' 
          : 'window.detectInAppBrowser (전역 함수 fallback)';
        
        console.log('🔍 [useInAppBrowser] 인앱 브라우저 감지:', {
          type: detectedType,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'N/A',
          isInApp: detectedType !== 'none',
          source,
          attempts,
        });
      } catch (error) {
        console.error('❌ [useInAppBrowser] 인앱 브라우저 감지 중 에러:', error);
        // 에러 발생 시 일반 브라우저로 간주 (안전한 기본값)
        setType('none');
      }
    };
    
    // 🔥 즉시 확인 시도
    checkDetectFunction();
  }, []); // 🔥 의존성 배열 비움 - 마운트 시 한 번만 실행

  const isInApp = type !== 'none';
  const isNormalBrowser = !isInApp;

  return { type, isInApp, isNormalBrowser };
}

