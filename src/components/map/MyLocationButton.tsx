/**
 * 🔥 B 단계: 내 위치 버튼 (지도 위 최소 UX)
 * 
 * 위치: MapWrapper 우하단 고정
 * 역할: 현재 위치로 지도 이동
 */

import React from 'react';

interface MyLocationButtonProps {
  onClick: () => void;
}

export default function MyLocationButton({ onClick }: MyLocationButtonProps) {
  return (
    <button
      className="my-location-btn"
      onClick={onClick}
      style={{
        position: 'absolute',
        right: '12px',
        bottom: '12px',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: '#ffffff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 25, // 🔥 내 위치 버튼 레이어
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      aria-label="내 위치로 이동"
    >
      <span style={{ fontSize: '20px' }}>📍</span>
    </button>
  );
}
