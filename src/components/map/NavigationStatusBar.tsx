/**
 * 🔥 네비게이션 상단 상태바
 * 
 * NAVIGATING 상태일 때만 표시되는 상단 상태바
 * - 목적지 이름
 * - 이동 수단
 * - 남은 거리 / 예상 시간
 */

import React from 'react';

type Props = {
  destinationName: string;
  travelMode?: 'WALKING' | 'DRIVING' | 'BICYCLING';
  distance?: string; // 예: "2.5km"
  duration?: string; // 예: "15분"
  isCalculating?: boolean; // 경로 계산 중 여부
  statusText?: string; // 🔥 커스텀 상태 텍스트 (예: "출발 준비됨")
};

export default function NavigationStatusBar({
  destinationName,
  travelMode = 'DRIVING',
  distance,
  duration,
  isCalculating = false,
  statusText,
}: Props) {
  const modeLabel = travelMode === 'WALKING' ? '🚶 도보' 
    : travelMode === 'DRIVING' ? '🚗 차로'
    : '🚴 자전거';

  return (
    <div
      style={{
        position: 'fixed',
        top: `calc(var(--header-h, 56px) + env(safe-area-inset-top, 0px) + 8px)`,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900, // 🔥 검색창(700)보다 높게
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(12px)',
        borderRadius: '24px',
        padding: '12px 20px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        minWidth: '200px',
        maxWidth: 'calc(100% - 32px)',
        animation: 'fadeInDown 0.3s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* 이동 수단 */}
        <span
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#ffffff',
          }}
        >
          {modeLabel}
        </span>

        {/* 구분선 */}
        {!statusText && (distance || duration || isCalculating) && (
          <span
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            ·
          </span>
        )}

        {/* 커스텀 상태 텍스트 (PRE_NAVIGATING용) */}
        {statusText && (
          <span
            style={{
              fontSize: '14px',
              color: '#ffffff',
              fontWeight: '600',
            }}
          >
            {statusText}
          </span>
        )}

        {/* 경로 계산 중 */}
        {!statusText && isCalculating && (
          <span
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            경로 계산 중...
          </span>
        )}

        {/* 거리 */}
        {!statusText && !isCalculating && distance && (
          <span
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            {distance}
          </span>
        )}

        {/* 시간 */}
        {!statusText && !isCalculating && duration && (
          <>
            {distance && (
              <span
                style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                ·
              </span>
            )}
            <span
              style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              {duration}
            </span>
          </>
        )}

        {/* 목적지 이름 (짧게) */}
        {!statusText && !isCalculating && (
          <>
            {(distance || duration) && (
              <span
                style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                ·
              </span>
            )}
            <span
              style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.8)',
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={destinationName}
            >
              {destinationName}
            </span>
          </>
        )}
      </div>

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
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
