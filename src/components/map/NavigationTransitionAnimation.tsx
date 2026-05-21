/**
 * 🔥 네비게이션 전환 애니메이션
 * 
 * 출발 버튼 클릭 시 3연타 애니메이션:
 * 1. 버튼 피드백 (150-300ms)
 * 2. 지도 연출 (300-600ms)
 * 3. UI 스왑 (컴포넌트 교체)
 */

import React, { useState, useEffect } from 'react';

type TransitionPhase = 'idle' | 'button-feedback' | 'map-animation' | 'ui-swap' | 'complete';

type Props = {
  onTransitionStart?: () => void;
  onTransitionComplete?: () => void;
  children: React.ReactNode;
};

export function NavigationTransitionAnimation({
  onTransitionStart,
  onTransitionComplete,
  children,
}: Props) {
  const [phase, setPhase] = useState<TransitionPhase>('idle');

  useEffect(() => {
    if (phase === 'complete' && onTransitionComplete) {
      onTransitionComplete();
    }
  }, [phase, onTransitionComplete]);

  const startTransition = () => {
    if (onTransitionStart) {
      onTransitionStart();
    }

    // 1. 버튼 피드백 (150ms)
    setPhase('button-feedback');
    setTimeout(() => {
      // 2. 지도 연출 (300ms)
      setPhase('map-animation');
      setTimeout(() => {
        // 3. UI 스왑 (즉시)
        setPhase('ui-swap');
        setTimeout(() => {
          setPhase('complete');
        }, 100);
      }, 300);
    }, 150);
  };

  return (
    <div
      style={{
        transition: phase === 'ui-swap' ? 'opacity 0.2s ease-out' : 'none',
        opacity: phase === 'ui-swap' ? 0 : 1,
      }}
    >
      {children}
    </div>
  );
}

/**
 * 출발 버튼 피드백 컴포넌트
 */
export function StartButtonFeedback({ isPressed }: { isPressed: boolean }) {
  if (!isPressed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        padding: '16px 24px',
        color: '#fff',
        fontSize: '15px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '20px',
          height: '20px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderTopColor: '#ffffff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      경로 계산 중...
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
