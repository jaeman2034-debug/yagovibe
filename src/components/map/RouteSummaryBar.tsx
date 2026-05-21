/**
 * 🔥 AI 비서 레이아웃: 상단 경로 안내 바
 * 
 * navigationStarted가 true일 때만 상단에 고정된(Fixed) 플로팅 카드를 띄워줘.
 * 여기엔 MapController에서 계산된 duration과 distance를 티맵처럼 아주 크게 표시해줘.
 */

import React from 'react';

interface RouteSummaryBarProps {
  distance?: string;
  duration?: string;
  travelMode?: 'TRANSIT' | 'DRIVING' | 'WALKING';
  destinationName?: string;
  isVisible?: boolean; // 🔥 navigationStarted 상태
}

export default function RouteSummaryBar({
  distance,
  duration,
  travelMode = 'TRANSIT',
  destinationName,
  isVisible = false,
}: RouteSummaryBarProps) {
  if (!isVisible) {
    return null;
  }

  const modeText = travelMode === 'TRANSIT' ? '대중교통' : travelMode === 'DRIVING' ? '자동차' : '도보';
  const modeIcon = travelMode === 'TRANSIT' ? '🚇' : travelMode === 'DRIVING' ? '🚗' : '🚶';

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '500px',
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      {destinationName && (
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>
          {destinationName}
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
        {/* 소요 시간 - 티맵처럼 아주 크게 표시 */}
        {duration && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', lineHeight: '1' }}>
              {duration}
            </div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>
              소요 시간
            </div>
          </div>
        )}

        {/* 구분선 */}
        {duration && distance && (
          <div style={{ width: '1px', height: '40px', backgroundColor: '#E0E0E0' }} />
        )}

        {/* 거리 - 티맵처럼 아주 크게 표시 */}
        {distance && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', lineHeight: '1' }}>
              {distance}
            </div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>
              남은 거리
            </div>
          </div>
        )}
      </div>

      {/* 이동 수단 표시 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
        <span style={{ fontSize: '16px' }}>{modeIcon}</span>
        <span style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>{modeText}</span>
      </div>
    </div>
  );
}
