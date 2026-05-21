/**
 * 🔥 목적지 확정: 장소 이름 라벨
 * 
 * "여기로 가볼게요" 클릭 후 목적지 정보를 명확히 표시
 * 원칙: 이름만, 짧게, 지도 위에 떠 있게
 */

import React from 'react';

type Props = {
  placeName: string;
  isVisible: boolean;
};

export default function DestinationLabel({ placeName, isVisible }: Props) {
  // 🔒 mount/unmount 로그: 렌더 트리에서 언마운트 여부 확인
  React.useEffect(() => {
    console.log('🟢 [DestinationLabel] MOUNT', placeName);
    return () => {
      console.log('🔴 [DestinationLabel] UNMOUNT', placeName);
    };
  }, [placeName]);
  
  if (!isVisible || !placeName) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '120px', // 🔥 하단 미니 바 위치 (네비게이션 바 위)
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 19, // 🔥 목적지 라벨 레이어 (추천 카드 아래, 네비게이션 카드 위)
        backgroundColor: 'rgba(16, 185, 129, 0.95)', // 🔥 초록색 (목적지 색상과 일치)
        color: '#ffffff',
        padding: '10px 20px',
        borderRadius: '24px',
        fontSize: '15px',
        fontWeight: '600',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.5), 0 2px 8px rgba(0,0,0,0.3)',
        pointerEvents: 'none', // 🔥 클릭 불가 (정보 표시용)
        animation: 'fadeInSlideUp 0.4s ease-out',
        maxWidth: 'calc(100vw - 64px)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        border: '2px solid rgba(255, 255, 255, 0.3)', // 🔥 미세한 테두리로 입체감
      }}
    >
      🎯 {placeName} · 목적지
      <style>{`
        @keyframes fadeInSlideUp {
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
