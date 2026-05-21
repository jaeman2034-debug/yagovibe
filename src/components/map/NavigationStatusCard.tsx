/**
 * 🔥 NAVIGATING 상태 전용 UI 카드
 * 
 * 출발 후 내비게이션 중에 표시되는 최소 UI
 * - 목적지 이름
 * - "내비게이션 중" 상태 표시
 * - 중지 버튼
 */

import React from 'react';

type Props = {
  destinationName: string;
  distance?: number; // 거리 (미터)
  address?: string; // 주소
  onStop: () => void;
};

export default function NavigationStatusCard({ destinationName, distance, address, onStop }: Props) {
  // 🔒 mount/unmount 로그
  React.useEffect(() => {
    console.log('🟢 [NavigationStatusCard] MOUNT', destinationName);
    return () => {
      console.log('🔴 [NavigationStatusCard] UNMOUNT', destinationName);
    };
  }, [destinationName]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '500px',
        zIndex: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      {/* 목적지 이름 */}
      <div
        style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1a73e8',
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        🎯 {destinationName}
      </div>
      
      {/* 목적지 상세 정보 (거리/주소) */}
      {(distance !== undefined || address) && (
        <div
          style={{
            fontSize: '13px',
            color: '#666',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          {distance !== undefined && (
            <span>
              {distance < 1000 
                ? `${Math.round(distance)}m`
                : `${(distance / 1000).toFixed(2)}km`
              }
            </span>
          )}
          {distance !== undefined && address && ' · '}
          {address && <span>{address}</span>}
        </div>
      )}
      
      {/* 내비게이션 중 상태 */}
      <div
        style={{
          fontSize: '13px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '12px',
        }}
      >
        내비게이션 중
      </div>
      
      {/* 중지 버튼 */}
      <button
        onClick={onStop}
        style={{
          width: '100%',
          padding: '12px 24px',
          borderRadius: '10px',
          background: '#f5f5f5',
          color: '#1a1a1a',
          fontSize: '14px',
          fontWeight: '500',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e5e5e5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f5f5f5';
        }}
      >
        안내 그만할게요
      </button>
      
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
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
