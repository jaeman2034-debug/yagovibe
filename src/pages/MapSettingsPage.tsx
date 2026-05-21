/**
 * 🔥 MapSettingsPage - 지도 추천 설정 페이지 (Phase 15)
 * 
 * 책임 범위:
 * ✅ 지도 추천 설정 관리
 * ✅ 기억 ON/OFF
 * ✅ 자동 추천 ON/OFF
 * ✅ 기억 삭제
 * 
 * ❌ 하지 않는 것:
 * - 지도 렌더링
 * - 검색 로직
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isMemoryEnabled, saveMemoryMeta, clearMemories, getMemories } from '@/utils/memoryStorage';
import { loadPreferencesFromServer } from '@/utils/serverMemory';
import { clearAllMapPreferences } from '@/utils/serverMemory';

export default function MapSettingsPage() {
  const navigate = useNavigate();
  const [memoryEnabled, setMemoryEnabled] = useState(isMemoryEnabled());
  const [autoRecommend, setAutoRecommend] = useState(true); // 🔥 Phase 15: 자동 추천 기본값
  const [memoriesCount, setMemoriesCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const memories = getMemories();
    setMemoriesCount(memories.length);
  }, []);

  const handleToggleMemory = () => {
    const newValue = !memoryEnabled;
    setMemoryEnabled(newValue);
    saveMemoryMeta({ enabled: newValue });
    console.log('[MapSettings] 기억 토글:', newValue);
  };

  const handleToggleAutoRecommend = () => {
    setAutoRecommend(!autoRecommend);
    // TODO: 서버에 자동 추천 설정 저장
    console.log('[MapSettings] 자동 추천 토글:', !autoRecommend);
  };

  const handleClearAllMemory = async () => {
    clearMemories();
    await clearAllMapPreferences();
    setMemoriesCount(0);
    setShowDeleteConfirm(false);
    console.log('[MapSettings] 모든 지도 기억 삭제 완료');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← 뒤로
          </button>
          <h1 className="text-2xl font-bold text-gray-900">지도 추천 설정</h1>
          <p className="text-sm text-gray-600 mt-1">
            선택하신 경우에만 기억해요. 언제든 끌 수 있어요.
          </p>
        </div>

        {/* 설정 섹션 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* 기억 사용 */}
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">자주 가는 장소 기억</div>
              <div className="text-xs text-gray-500 mt-1">
                이전 선택을 참고해서 추천해드려요
              </div>
            </div>
            <button
              onClick={handleToggleMemory}
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
          </label>

          {/* 자동 추천 */}
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">자동 추천 표시</div>
              <div className="text-xs text-gray-500 mt-1">
                검색 전에도 추천 장소를 보여드려요
              </div>
            </div>
            <button
              onClick={handleToggleAutoRecommend}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoRecommend ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoRecommend ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>

          {/* 저장된 기억 정보 */}
          {memoriesCount > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-2">
                저장된 기억: {memoriesCount}개
              </div>
              <div className="text-xs text-gray-500">
                지도 추천에만 사용돼요
              </div>
            </div>
          )}

          {/* 기억 삭제 */}
          <div className="pt-4 border-t border-gray-200">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                지도 기억 전체 삭제
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-gray-600">
                  정말 삭제하시겠어요?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearAllMemory}
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
        </section>

        {/* 데이터 사용 안내 */}
        <section className="bg-gray-50 rounded-xl p-6 mt-6">
          <h2 className="text-sm font-medium text-gray-900 mb-3">데이터 사용 안내</h2>
          <div className="text-xs text-gray-600 space-y-2">
            <p>• 선택한 장소 정보만 저장됩니다</p>
            <p>• 위치 좌표는 저장하지 않습니다</p>
            <p>• 지도 추천에만 사용돼요</p>
            <p>• 언제든지 기억을 삭제할 수 있습니다</p>
          </div>
        </section>
      </div>
    </div>
  );
}
