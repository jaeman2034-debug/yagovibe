/**
 * 🔥 MapResultPanel - 추천 UX (Phase 7)
 * 
 * 책임 범위:
 * ✅ 추천 장소 표시
 * ✅ "이 장소 보기" 버튼 제공
 * 
 * ❌ 하지 않는 것:
 * - 자동 이동
 * - 지도 조작
 * - 검색 로직
 */

import React from 'react';
import ServiceExtensionPanel from './ServiceExtensionCard'; // 🔥 Phase 17: 서비스 확장 패널

type MapPlace = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

type MapResultPanelProps = {
  recommended?: MapPlace | null;
  recommendationReason?: string; // 🔥 Phase 11: 추천 이유
  searchQuery?: string; // 🔥 Phase 17: 검색어 (서비스 확장용)
  distance?: number; // 🔥 Phase 22: 거리 정보 (km)
  placesCount?: number; // 🔥 Phase 22: 전체 장소 개수
  onSelect: (place: MapPlace) => void;
  onShowOther?: () => void; // 🔥 Phase 22: 다른 곳 보여주기
  onOpenMemoryControl?: () => void; // 🔥 Phase 14: 기억 제어 패널 열기
};

export default function MapResultPanel({
  recommended,
  recommendationReason = '',
  searchQuery = '', // 🔥 Phase 17: 검색어 추가
  distance, // 🔥 Phase 22: 거리 정보
  placesCount = 0, // 🔥 Phase 22: 전체 장소 개수
  onSelect,
  onShowOther, // 🔥 Phase 22: 다른 곳 보여주기
  onOpenMemoryControl,
}: MapResultPanelProps) {
  if (!recommended) return null;

  // 🔥 Phase 22: 거리 포맷팅
  const formatDistance = (km?: number): string => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  return (
    <div className="absolute bottom-32 left-0 right-0 z-[51] pointer-events-auto animate-slide-up">
      <div className="bg-white rounded-t-2xl shadow-xl mx-4 relative">
        {/* 🔥 Phase 14: 투명성 정보 버튼 (우측 상단) */}
        {onOpenMemoryControl && (
          <button
            onClick={onOpenMemoryControl}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-lg w-6 h-6 flex items-center justify-center"
            title="추천 이유 보기"
          >
            ⓘ
          </button>
        )}
        <div className="px-4 pt-4 pb-3">
          {/* 🔥 Phase 22: 첫 노출 문구 */}
          <div className="text-xs text-gray-500 mb-1">
            가장 가까운 곳은 여기예요
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {recommended.name || '장소'}
          </div>
          <div className="flex items-center gap-3 mt-2">
            {/* 🔥 Phase 22: 거리 정보 */}
            {distance !== undefined && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <span>⏱️</span>
                <span>도보 {formatDistance(distance)}</span>
              </div>
            )}
            {/* 🔥 Phase 11: 추천 이유 표시 */}
            {recommendationReason && (
              <div className="text-xs text-gray-500">
                {recommendationReason}
              </div>
            )}
          </div>
        </div>
        <div className="px-4 pb-4 space-y-2">
          {/* 🔥 Phase 22: 선택 유도 버튼 */}
          <button
            onClick={() => onSelect(recommended)}
            className="w-full rounded-xl bg-gray-200 text-gray-800 py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-gray-300 transition-colors active:scale-[0.98]"
          >
            여기로 갈까요?
          </button>
          
          {/* 🔥 Phase 22: 다른 곳 보여주기 버튼 (여러 장소가 있을 때만) */}
          {placesCount > 1 && onShowOther && (
            <button
              onClick={onShowOther}
              className="w-full rounded-xl bg-white border border-gray-300 text-gray-700 py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
              다른 곳 보여줘
            </button>
          )}
          
          {/* 🔥 Phase 17: 서비스 확장 패널 */}
          <ServiceExtensionPanel place={recommended} searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}
