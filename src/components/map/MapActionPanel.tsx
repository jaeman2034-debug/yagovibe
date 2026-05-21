/**
 * 🔥 MapActionPanel - 실행 UX (Phase 8)
 * 
 * 책임 범위:
 * ✅ "이곳으로 갈게" 버튼 제공
 * ✅ 길 안내 실행 트리거
 * 
 * ❌ 하지 않는 것:
 * - 자동 길 안내
 * - 지도 조작
 */

import React from 'react';

type MapActionPanelProps = {
  onNavigate: () => void;
};

export default function MapActionPanel({
  onNavigate,
}: MapActionPanelProps) {
  return (
    <div className="absolute bottom-4 left-0 right-0 z-[52] pointer-events-auto animate-fade-in-delay">
      <div className="mx-4">
        <button
          onClick={onNavigate}
          className="w-full rounded-xl bg-black text-white py-3 px-4 text-sm font-semibold shadow-lg hover:bg-gray-900 transition-colors active:scale-[0.98]"
        >
          여기로 갈까요?
        </button>
      </div>
    </div>
  );
}
