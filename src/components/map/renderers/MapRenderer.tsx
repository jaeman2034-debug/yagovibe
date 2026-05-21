/**
 * 🔥 MapRenderer - 플랫폼별 지도 렌더러 분기 엔트리
 * 
 * 책임:
 * - Web 환경: WebMapRenderer (Google Maps)
 * - Native 환경: NativeMapRenderer (react-native-maps)
 * 
 * 핵심 원칙:
 * - 웹에서는 절대 react-native-maps를 import하지 않음
 * - require를 사용하여 런타임에만 NativeMapRenderer 로드
 * - Vite가 빌드 타임에 RN 모듈을 스캔하지 않도록 보장
 */

import React, { lazy, Suspense } from 'react';
import type { MapPageV3Props } from '@/types/map';

// 🔥 WebMapRenderer는 항상 import (웹 프로젝트이므로)
const WebMapRenderer = lazy(() => import('./WebMapRenderer'));

// 🔥 웹 환경 체크
const isWeb = typeof window !== 'undefined' && 
  typeof (window as any).navigator !== 'undefined' && 
  (window as any).navigator.product !== 'ReactNative';

/**
 * MapRenderer - 플랫폼별 지도 렌더러
 */
export default function MapRenderer(props: MapPageV3Props) {
  // 🔥 웹 환경: WebMapRenderer만 사용
  if (isWeb) {
    return (
      <Suspense fallback={
        <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center rounded-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">지도 로딩 중...</p>
          </div>
        </div>
      }>
        <WebMapRenderer {...props} />
      </Suspense>
    );
  }

  // 🔥 Native 환경: 런타임에만 require (Vite 빌드 타임 스캔 방지)
  // ❌ import NativeMapRenderer 절대 금지 (Vite가 스캔함)
  try {
    // @ts-ignore - React Native 환경에서만 존재
    const NativeMapRenderer = require('./NativeMapRenderer').default;
    return (
      <Suspense fallback={
        <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center rounded-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">지도 로딩 중...</p>
          </div>
        </div>
      }>
        <NativeMapRenderer {...props} />
      </Suspense>
    );
  } catch (error) {
    console.error('❌ [MapRenderer] NativeMapRenderer 로드 실패:', error);
    return (
      <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center rounded-2xl">
        <p className="text-sm text-gray-600">지도를 불러올 수 없습니다.</p>
      </div>
    );
  }
}
