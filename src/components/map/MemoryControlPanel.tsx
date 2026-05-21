/**
 * 🔥 MemoryControlPanel - 기억 제어 & 투명성 UX (Phase 14)
 * 
 * 책임 범위:
 * ✅ 기억 ON/OFF 토글
 * ✅ 기억 삭제
 * ✅ 추천 이유 상세 설명
 * ✅ 데이터 사용 투명성
 * 
 * ❌ 하지 않는 것:
 * - 기억 저장 (MapController 책임)
 * - 추천 계산 (MapController 책임)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isMemoryEnabled, saveMemoryMeta, clearMemories, getMemories, formatRelativeTime } from '@/utils/memoryStorage';

type MemoryControlPanelProps = {
  recommendedPlace?: { id: string; name?: string } | null;
  recommendationReasons?: string[]; // 🔥 Phase 14: 추천 이유 상세 리스트
  currentCategory?: string; // 🔥 Phase 14: 현재 검색 카테고리
  onClose: () => void;
  onMemoryToggle?: (enabled: boolean) => void;
  onMemoryClear?: () => void;
  onDisableCategory?: (category: string) => void; // 🔥 Phase 14: 카테고리 추천 끄기
  onDeletePlaceMemory?: (placeId: string) => void; // 🔥 Phase 14: 특정 장소 기억 삭제
};

export default function MemoryControlPanel({
  recommendedPlace,
  recommendationReasons = [],
  currentCategory = '',
  onClose,
  onMemoryToggle,
  onMemoryClear,
  onDisableCategory,
  onDeletePlaceMemory,
}: MemoryControlPanelProps) {
  const navigate = useNavigate();
  const [memoryEnabled, setMemoryEnabled] = useState(isMemoryEnabled());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const memories = getMemories();

  const handleToggle = () => {
    const newValue = !memoryEnabled;
    setMemoryEnabled(newValue);
    saveMemoryMeta({ enabled: newValue });
    onMemoryToggle?.(newValue);
    console.log('[MemoryControlPanel] 기억 토글:', newValue);
  };

  const handleDeleteAll = () => {
    clearMemories();
    onMemoryClear?.();
    setShowDeleteConfirm(false);
    console.log('[MemoryControlPanel] 모든 기억 삭제 완료');
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl pointer-events-auto z-[70] max-h-[80vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">기억 설정</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* 🔥 Phase 14: 추천 이유 상세 설명 */}
        {recommendationReasons.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-900 mb-2">
              왜 이 장소를 추천했나요?
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              {recommendationReasons.map((reason, index) => (
                <li key={index}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 🔥 기억 ON/OFF 토글 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">기억 사용</div>
            <div className="text-xs text-gray-500 mt-1">
              이전 선택을 참고해서 추천해드려요
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              memoryEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                memoryEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* 🔥 저장된 기억 목록 */}
        {memories.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-900 mb-2">
              저장된 기억 ({memories.length}개)
            </div>
            <div className="space-y-2">
              {memories.slice(0, 5).map((memory, index) => (
                <div key={index} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                  <div className="font-medium">{memory.keyword}</div>
                  <div className="text-gray-500">{formatRelativeTime(memory.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🔥 데이터 사용 투명성 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-900 mb-2">데이터 사용 안내</div>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• 선택한 장소 정보만 저장됩니다</p>
            <p>• 위치 좌표는 저장하지 않습니다</p>
            <p>• 언제든지 기억을 삭제할 수 있습니다</p>
          </div>
        </div>

        {/* 🔥 Phase 14: 제어 버튼들 */}
        <div className="space-y-2">
          {/* 이 유형 추천 끄기 */}
          {currentCategory && onDisableCategory && (
            <button
              onClick={() => {
                onDisableCategory(currentCategory);
                onClose();
              }}
              className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              이 유형 추천 끄기
            </button>
          )}
          
          {/* 이 장소 기억 삭제 */}
          {recommendedPlace && onDeletePlaceMemory && (
            <button
              onClick={() => {
                onDeletePlaceMemory(recommendedPlace.id);
                onClose();
              }}
              className="w-full bg-red-100 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              이 장소 기억 삭제
            </button>
          )}
        </div>

        {/* 🔥 기억 삭제 버튼 */}
        {memories.length > 0 && (
          <div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-sm text-red-600 hover:text-red-700 py-2"
              >
                모든 기억 삭제
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-gray-600 text-center">
                  정말 삭제하시겠어요?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAll}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
