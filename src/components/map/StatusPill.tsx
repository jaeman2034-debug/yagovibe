/**
 * 🔥 리모델링: 상태 메시지 단일화 컴포넌트
 * 
 * 규칙: 한 번에 하나, 중앙에, 자동으로 사라진다
 * MapUIState에 종속된 유일한 지도 위 UI
 */

import React from 'react';
import { MapUIState } from '@/hooks/useMapUI';

interface StatusPillProps {
  ui: MapUIState;
  errorMessage?: string;
  onRetry?: () => void;
}

export default function StatusPill({ ui, errorMessage, onRetry }: StatusPillProps) {
  // result, navigating은 하단으로 이동 (지도 위에는 표시 안 함)
  if (ui === 'idle' || ui === 'result' || ui === 'navigating') {
    return null;
  }

  // 위치: 지도 상단 중앙
  // top: calc(Header 48px + TransportTabs 44px + safe-area + 16px)
  const topOffset = `calc(48px + 44px + env(safe-area-inset-top, 0px) + 16px)`;

  const baseStyles: React.CSSProperties = {
    position: 'fixed',
    top: topOffset,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 50,
    padding: '8px 16px',
    borderRadius: '9999px',
    fontSize: '13px',
    fontWeight: 500,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    pointerEvents: 'auto',
    transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
  };

  if (ui === 'loading') {
    return (
      <div
        style={{
          ...baseStyles,
          backgroundColor: 'rgb(245, 245, 245)',
          color: 'rgb(55, 65, 81)',
        }}
        className="animate-pulse"
      >
        🔍 찾는 중…
      </div>
    );
  }

  if (ui === 'voice') {
    return (
      <div
        style={{
          ...baseStyles,
          backgroundColor: 'rgb(220, 252, 231)',
          color: 'rgb(22, 101, 52)',
        }}
        className="animate-pulse"
      >
        🎙 지금 말해도 돼요
      </div>
    );
  }

  if (ui === 'error') {
    return (
      <div
        style={{
          ...baseStyles,
          backgroundColor: 'rgb(254, 242, 242)',
          color: 'rgb(153, 27, 27)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span>📡 {errorMessage || '연결이 불안정해요'}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgb(220, 38, 38)',
              color: 'white',
              fontSize: '12px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
            className="active:scale-95 transition-transform"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  return null;
}
