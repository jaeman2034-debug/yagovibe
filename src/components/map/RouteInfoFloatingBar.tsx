/**
 * 🔥 2단계: 실시간 정보 플로팅 카드 (UX 고도화)
 * 
 * 티맵처럼 화면 상단이나 하단에 남은 시간, 거리, 도착 예정 시각을 보여주는 고정 카드
 */

import React from 'react';

interface RouteInfoFloatingBarProps {
  distance?: string;
  duration?: string;
  travelMode?: 'TRANSIT' | 'DRIVING' | 'WALKING';
  destinationName?: string;
}

export default function RouteInfoFloatingBar({
  distance,
  duration,
  travelMode = 'TRANSIT',
  destinationName,
}: RouteInfoFloatingBarProps) {
  // 🔥 2단계: 도착 예정 시간 계산 - 현재 시간 + 소요 시간을 계산해서 표시해줘
  const calculateArrivalTime = (durationText: string): string => {
    if (!durationText) return '';
    
    // "15분", "1시간 30분" 같은 텍스트를 파싱
    const minutesMatch = durationText.match(/(\d+)\s*분/);
    const hoursMatch = durationText.match(/(\d+)\s*시간/);
    
    let totalMinutes = 0;
    if (hoursMatch) {
      totalMinutes += parseInt(hoursMatch[1]) * 60;
    }
    if (minutesMatch) {
      totalMinutes += parseInt(minutesMatch[1]);
    }
    
    if (totalMinutes === 0) return '';
    
    const now = new Date();
    const arrival = new Date(now.getTime() + totalMinutes * 60 * 1000);
    
    const hours = arrival.getHours();
    const minutes = arrival.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    
    return `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const arrivalTime = duration ? calculateArrivalTime(duration) : '';
  
  // 🔥 2단계: 이동 수단 텍스트 변환
  const modeText = travelMode === 'TRANSIT' ? '대중교통' : travelMode === 'DRIVING' ? '자동차' : '도보';

  if (!distance && !duration) {
    return null;
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      style={{
        // 🔥 2단계: 디자인은 티맵처럼 반투명한 흰색 배경에 둥근 모서리를 적용해줘
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        padding: '12px 20px',
        minWidth: '280px',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div className="flex items-center gap-4">
        {/* 이동 수단 아이콘 */}
        <div className="flex-shrink-0">
          {travelMode === 'TRANSIT' && (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xl">🚇</span>
            </div>
          )}
          {travelMode === 'DRIVING' && (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xl">🚗</span>
            </div>
          )}
          {travelMode === 'WALKING' && (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xl">🚶</span>
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="flex-1 min-w-0">
          {destinationName && (
            <div className="text-xs text-gray-600 mb-1 truncate">
              {destinationName}
            </div>
          )}
          <div className="flex items-center gap-3">
            {/* 소요 시간 */}
            {duration && (
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-gray-900">{duration}</span>
                <span className="text-xs text-gray-500">소요</span>
              </div>
            )}
            
            {/* 거리 */}
            {distance && (
              <div className="flex items-center gap-1 text-gray-600">
                <span className="text-sm">·</span>
                <span className="text-sm">{distance}</span>
              </div>
            )}
          </div>
          
          {/* 도착 예정 시간 */}
          {arrivalTime && (
            <div className="text-xs text-gray-500 mt-1">
              도착 예정: {arrivalTime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
