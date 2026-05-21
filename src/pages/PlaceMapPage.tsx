/**
 * 🔥 Phase 18: MapPage - 플랫폼 분기 조립자
 * 
 * 책임:
 * ✅ 플랫폼 감지 및 적절한 Renderer 선택
 * ✅ MapController와 Renderer 연결
 * ✅ 공용 UX 패널 렌더링
 * 
 * 원칙:
 * - Controller = 뇌 (공용)
 * - Renderer = 눈 (플랫폼별)
 * - UX = 얼굴 (공용)
 */

import { lazy, Suspense } from 'react';
import { detectPlatform } from '@/utils/platform';

// 🔥 Phase 18: 플랫폼별 Renderer 동적 import
const WebMapRenderer = lazy(() => import('@/components/map/renderers/WebMapRenderer'));
const NativeMapRenderer = lazy(() => import('@/components/map/renderers/NativeMapRenderer'));

// 🔥 Phase 18: 공용 Controller 및 UX
const MapController = lazy(() => import('@/components/map/MapController'));

/**
 * 🔥 Phase 18: MapPage - 플랫폼 분기 조립자
 * 
 * 이 컴포넌트는:
 * - 플랫폼을 감지하여 적절한 Renderer를 선택
 * - MapController의 공용 로직을 사용
 * - 모든 UX 패널은 Controller 내부에서 처리
 */
export default function MapPage() {
  const platform = detectPlatform();
  
  // 🔥 Phase 18: 플랫폼별 Renderer 선택
  const MapRenderer = platform === 'web' ? WebMapRenderer : NativeMapRenderer;

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">지도를 불러오는 중...</p>
        </div>
      </div>
    }>
      {/* 🔥 Phase 18: MapController가 모든 로직을 담당 */}
      {/* Controller 내부에서 플랫폼별 Renderer를 선택 */}
      <MapController 
        // MapController 내부에서 이미 플랫폼 분기 처리됨
        // 여기서는 추가 props만 전달
      />
    </Suspense>
  );
}
