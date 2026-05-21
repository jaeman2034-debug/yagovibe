/**
 * 🔥 리모델링: 하단 액션 시트 (엄지 UX)
 * 
 * 위치: fixed bottom-0
 * 역할: 행동 (사용자는 생각 안 하고 누른다)
 */

import React from 'react';
import { MapUIState } from '@/hooks/useMapUI';

interface BottomActionSheetProps {
  ui: MapUIState;
  place?: { name: string; id: string };
  onNavigate?: () => void;
  onReopenRoute?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

export default function BottomActionSheet({
  ui,
  place,
  onNavigate,
  onReopenRoute,
  onCancel,
  onRetry,
}: BottomActionSheetProps) {
  // 결과 없음 / 로딩 / 음성 → 하단 숨김
  if (ui === 'idle' || ui === 'loading' || ui === 'voice') {
    return null;
  }

  // 검색 완료 (장소 선택됨)
  if (ui === 'result' && place) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-100 bg-white shadow-xl border-t border-neutral-200"
        style={{
          paddingTop: '20px',
          paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px))`,
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl">
          <p className="text-sm font-semibold text-neutral-900 mb-4">
            📍 {place.name}
          </p>
          <div className="border-t border-neutral-100 pt-4">
            <button
              onClick={onNavigate}
              className="w-full rounded-full bg-blue-600 py-3 text-sm text-white font-medium active:scale-95 transition-transform shadow-lg"
            >
              여기로 안내할게요
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 안내 중
  if (ui === 'navigating' && place) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-100 bg-white shadow-xl border-t border-neutral-200"
        style={{
          paddingTop: '20px',
          paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px))`,
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl">
          <p className="text-sm font-semibold text-neutral-900 mb-4">
            🧭 {place.name}까지 안내 중
          </p>
          <div className="border-t border-neutral-100 pt-4 flex gap-2">
            <button
              onClick={onReopenRoute}
              className="flex-1 rounded-full bg-blue-600 py-3 text-sm text-white font-medium active:scale-95 transition-transform shadow-lg"
            >
              다시 길찾기
            </button>
            <button
              onClick={onCancel}
              className="flex-1 rounded-full bg-neutral-100 py-3 text-sm text-neutral-700 font-medium active:scale-95 transition-transform"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 에러
  if (ui === 'error') {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-100 bg-white shadow-xl border-t border-neutral-200"
        style={{
          paddingTop: '20px',
          paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px))`,
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl">
          <p className="text-sm font-medium text-neutral-900 mb-4">
            지금은 길찾기를 열 수 없어요
          </p>
          <div className="border-t border-neutral-100 pt-4">
            <button
              onClick={onRetry}
              className="w-full rounded-full bg-red-600 py-3 text-sm text-white font-medium active:scale-95 transition-transform shadow-lg"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
