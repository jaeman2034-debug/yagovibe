/**
 * 🔥 리모델링 Step 1: 지도 위 유일 UI
 * 
 * 규칙:
 * - 상태 설명만 (클릭 없음, 행동 유도 없음)
 * - 사람 말투
 * - 3개 상태만: idle, result, error
 */

import React from 'react';

type MapStatusUI = 'idle' | 'result' | 'error';

interface MapStatusPillProps {
  ui: MapStatusUI;
}

export default function MapStatusPill({ ui }: MapStatusPillProps) {
  const message =
    ui === 'idle'
      ? '지금 어디로 갈까요?'
      : ui === 'result'
      ? '여기 맞나요?'
      : '다시 한 번 말해볼까요?';

  return (
    <div
      style={{
        position: 'fixed', // 🔥 fixed로 변경하여 지도와 독립적으로 배치
        top: 'calc(var(--header-h, 56px) + 16px)', // 헤더 높이 + 여백
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 16px',
        borderRadius: 999,
        background: '#111',
        color: '#fff',
        fontSize: 14,
        fontWeight: 500,
        zIndex: 10000, // 🔥 Google Maps 위에 표시되도록 매우 높은 z-index
        pointerEvents: 'none', // 클릭 불가
        whiteSpace: 'nowrap', // 텍스트 줄바꿈 방지
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)', // 가독성 향상
      }}
    >
      {message}
    </div>
  );
}
