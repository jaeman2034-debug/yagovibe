/**
 * 🔥 Phase 상태 표시 인디케이터
 * 
 * 현재 네비게이션 상태를 명확하게 표시
 * "사용자가 지금 뭘 하고 있는지" 0.5초 안에 보이게
 */

import React from 'react';

type Phase = 'IDLE' | 'SEARCHING' | 'CONFIRMED' | 'PRE_NAVIGATING' | 'NAVIGATING' | 'ARRIVED';

type Props = {
  phase: Phase;
};

export default function PhaseStatusIndicator({ phase }: Props) {
  const getStatusConfig = () => {
    switch (phase) {
      case 'IDLE':
        return {
          text: '검색 중',
          color: '#666',
          fontSize: '13px',
          fontWeight: '400' as const,
        };
      case 'SEARCHING':
        return {
          text: '검색 중',
          color: '#666',
          fontSize: '13px',
          fontWeight: '400' as const,
        };
      case 'CONFIRMED':
        return {
          text: '목적지 선택됨',
          color: '#1a73e8',
          fontSize: '14px',
          fontWeight: '500' as const,
        };
      case 'NAVIGATING':
        return {
          text: '안내 중',
          color: '#22c55e',
          fontSize: '15px',
          fontWeight: '600' as const,
        };
      case 'ARRIVED':
        return {
          text: '도착했습니다',
          color: '#22c55e',
          fontSize: '15px',
          fontWeight: '600' as const,
        };
      default:
        return {
          text: '',
          color: '#666',
          fontSize: '13px',
          fontWeight: '400' as const,
        };
    }
  };

  const config = getStatusConfig();

  // PRE_NAVIGATING/NAVIGATING/ARRIVED 상태는 NavigationStatusBar가 표시하므로 여기서는 숨김
  if (phase === 'PRE_NAVIGATING' || phase === 'NAVIGATING' || phase === 'ARRIVED') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: `calc(var(--header-h, 56px) + env(safe-area-inset-top, 0px) + 8px)`,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 600, // 검색바(700)보다 낮게
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '20px',
        padding: '6px 16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${config.color}20`,
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        color: config.color,
        whiteSpace: 'nowrap',
        animation: 'fadeInDown 0.3s ease-out',
      }}
    >
      {config.text}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
