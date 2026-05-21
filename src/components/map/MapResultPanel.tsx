/**
 * 🔥 MapResultPanel - 지도 결과 요약 + 선택지 UI
 * 
 * 책임 범위:
 * ✅ 검색 결과 요약 표시
 * ✅ 다음 행동 선택지 제공 (비음성)
 * 
 * ❌ 하지 않는 것:
 * - 판단/검색/지도 조작
 * - 음성/TTS 처리
 */

import React, { useState } from 'react';
import { getMemories, isMemoryEnabled, formatRelativeTime, removeLatestMemory, getMemoryMeta, saveMemoryMeta } from '@/utils/memoryStorage';

type MapPlace = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

type MapResultPanelProps = {
  places: MapPlace[];
  recommendedPlaceId?: string; // 🔥 Phase 7: 추천 장소 ID
  onViewPlace?: (placeId: string) => void; // 🔥 Phase 7: 장소 보기 핸들러
  onViewOther?: () => void; // 🔥 Phase 7: 다른 곳 보기 핸들러
  onGoToPlace?: (placeId: string) => void; // 🔥 Phase 8: 장소로 가기 핸들러
  navigationStarted?: boolean; // 🔥 Phase 9: 길 안내 시작 상태
  onSearchAgain?: () => void; // 🔥 Phase 9: 검색 다시 하기 핸들러
  searchQuery?: string; // 🔥 Phase 11: 검색어 (추천 투명성용)
  usedMemory?: boolean; // 🔥 Phase 11: 기억 활용 여부
};

export default function MapResultPanel({ 
  places, 
  recommendedPlaceId,
  onViewPlace,
  onViewOther,
  onGoToPlace,
  navigationStarted = false, // 🔥 Phase 9: 길 안내 시작 상태
  onSearchAgain, // 🔥 Phase 9: 검색 다시 하기 핸들러
  searchQuery, // 🔥 Phase 11: 검색어
  usedMemory = false, // 🔥 Phase 11: 기억 활용 여부
}: MapResultPanelProps) {
  const recommendedPlace = recommendedPlaceId 
    ? places.find(p => p.id === recommendedPlaceId)
    : null;
  
  // 🔥 Phase 11: 기억 관리 UI 상태
  const [showMemoryDetail, setShowMemoryDetail] = useState(false);
  const memories = getMemories();
  const hasMemories = memories.length > 0;
  const memoryEnabled = isMemoryEnabled();
  
  // 🔥 Phase 11: 기억 토글 핸들러
  const handleMemoryToggle = () => {
    const meta = getMemoryMeta();
    saveMemoryMeta({ ...meta, enabled: !meta.enabled });
    setShowMemoryDetail(false);
  };
  
  // 🔥 Phase 11: 최근 기억 삭제 핸들러
  const handleRemoveLatestMemory = () => {
    removeLatestMemory();
    if (memories.length <= 1) {
      setShowMemoryDetail(false);
    }
  };
  // 🔥 Phase 13: 결과 없음 상태 (실패/오해 방지 UX)
  if (places.length === 0 && searchQuery && searchQuery.trim()) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-md pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 px-4 py-3">
          <p className="text-center text-gray-700 text-sm">
            조건을 조금 바꿔서 다시 찾아볼 수 있어요
          </p>
        </div>
      </div>
    );
  }
  
  // 🔥 검색어가 없으면 아무것도 표시하지 않음 (Phase 13: 지도만 표시)
  if (places.length === 0) {
    return null;
  }

  // 🔥 Phase 9: 길 안내 중 상태
  if (navigationStarted) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-md pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* 🔥 Phase 9: 실행 후 상태 표시 */}
          <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
            <p className="text-center text-gray-900 text-sm font-medium">
              길 안내 중
            </p>
          </div>

          {/* 🔥 Phase 9: 실행 중 선택지 */}
          <div className="p-3 space-y-2">
            {onViewOther && (
              <button
                onClick={() => {
                  onViewOther();
                  console.log('[MapResultPanel] 이벤트: 다른 장소 보기 클릭 (길 안내 중)');
                }}
                className="w-full rounded-lg bg-gray-200 text-gray-800 py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-gray-300 transition-colors active:scale-[0.98]"
              >
                다른 장소 보기
              </button>
            )}
            {onSearchAgain && (
              <button
                onClick={() => {
                  onSearchAgain();
                  console.log('[MapResultPanel] 이벤트: 검색 다시 하기 클릭 (길 안내 중)');
                }}
                className="w-full rounded-lg bg-blue-500 text-white py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-blue-600 transition-colors active:scale-[0.98]"
              >
                검색 다시 하기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 🔥 결과 있음 상태
  return (
    <>
      {/* 🔥 Phase 11: 기억 상세 보기 모달 */}
      {showMemoryDetail && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowMemoryDetail(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">기억 관리</h3>
            </div>
            
            {/* 🔥 Phase 11: 기억 토글 */}
            <div className="p-4 border-b border-gray-200">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">이전 선택 참고</span>
                <button
                  onClick={handleMemoryToggle}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    memoryEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      memoryEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>
            
            {/* 🔥 Phase 11: 최근 선택한 장소 목록 */}
            {memories.length > 0 && (
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">최근 선택한 장소</h4>
                <div className="space-y-2">
                  {memories.slice(0, 5).map((memory, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{memory.keyword}</p>
                        <p className="text-xs text-gray-500">{formatRelativeTime(memory.timestamp)}</p>
                      </div>
                      {index === 0 && (
                        <button
                          onClick={handleRemoveLatestMemory}
                          className="ml-2 text-xs text-red-600 hover:text-red-700"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowMemoryDetail(false)}
                className="w-full rounded-lg bg-gray-200 text-gray-800 py-2.5 px-4 text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-md pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* 🔥 Phase 11: 기억 작동 중 표시 */}
          {hasMemories && memoryEnabled && (
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowMemoryDetail(true)}
                className="text-xs text-gray-600 hover:text-gray-800 w-full text-left"
              >
                이전 선택을 참고하고 있어요
              </button>
            </div>
          )}
          
          {/* 🔥 Phase 7: 추천 장소 표시 */}
          {recommendedPlace && (
            <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
              <p className="text-center text-gray-900 text-sm font-medium">
                가장 가까운 곳은 여기예요
              </p>
              {recommendedPlace.name && (
                <p className="text-center text-gray-600 text-xs mt-1">
                  {recommendedPlace.name}
                </p>
              )}
              {/* 🔥 Phase 11: 추천 투명성 표시 */}
              {usedMemory && (
                <p className="text-center text-gray-500 text-xs mt-1">
                  이전 선택을 참고했어요
                </p>
              )}
            </div>
          )}

        {/* 🔥 결과 요약 */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-center text-gray-900 text-sm">
            근처에 장소가 <strong className="font-semibold text-blue-600">{places.length}</strong>곳 있어요
          </p>
        </div>

        {/* 🔥 Phase 7: 추천 장소 버튼 */}
        {recommendedPlace && (
          <div className="p-3 space-y-2">
            {/* 🔥 Phase 8: 실행 버튼 (가장 상단) */}
            {onGoToPlace && recommendedPlaceId && (
              <button
                onClick={() => {
                  onGoToPlace(recommendedPlaceId);
                }}
                className="w-full rounded-lg bg-blue-600 text-white py-3 px-4 text-sm font-semibold shadow-md hover:bg-blue-700 transition-colors active:scale-[0.98]"
              >
                이곳으로 갈게
              </button>
            )}
            <button
              onClick={() => {
                if (onViewPlace && recommendedPlaceId) {
                  onViewPlace(recommendedPlaceId);
                }
              }}
              className="w-full rounded-lg bg-red-500 text-white py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-red-600 transition-colors active:scale-[0.98]"
            >
              이 장소 보기
            </button>
            {places.length > 1 && (
              <button
                onClick={() => {
                  if (onViewOther) {
                    onViewOther();
                  }
                }}
                className="w-full rounded-lg bg-gray-200 text-gray-800 py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-gray-300 transition-colors active:scale-[0.98]"
              >
                다른 곳 보기
              </button>
            )}
          </div>
        )}

        {/* 🔥 기존 선택 행동 버튼 (추천 없을 때만) */}
        {!recommendedPlace && places.length >= 2 && (
          <div className="p-3 space-y-2">
            <button
              onClick={() => console.log('[MapResultPanel] 가장 가까운 곳 클릭')}
              className="w-full rounded-lg bg-blue-500 text-white py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-blue-600 transition-colors active:scale-[0.98]"
            >
              가장 가까운 곳
            </button>
            <button
              onClick={() => console.log('[MapResultPanel] 하나 추천해줘 클릭')}
              className="w-full rounded-lg bg-green-500 text-white py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-green-600 transition-colors active:scale-[0.98]"
            >
              하나 추천해줘
            </button>
            <button
              onClick={() => console.log('[MapResultPanel] 다시 찾기 클릭')}
              className="w-full rounded-lg bg-gray-200 text-gray-800 py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-gray-300 transition-colors active:scale-[0.98]"
            >
              다시 찾기
            </button>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
