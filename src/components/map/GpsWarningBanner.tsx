/**
 * ✅ MVP: GPS 불안정 경고 배너 (비침투)
 */

import React from 'react';

type Props = {
  message?: string;
};

export default function GpsWarningBanner({ 
  message = '위치 정확도가 낮아 길 안내가 부정확할 수 있어요',
}: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '500px',
        zIndex: 600,
        backgroundColor: 'rgba(255, 193, 7, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#856404',
        fontWeight: '500',
      }}
    >
      <span style={{ fontSize: '18px' }}>⚠️</span>
      <span>{message}</span>
    </div>
  );
}
