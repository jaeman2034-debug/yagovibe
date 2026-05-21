/**
 * 🔥 리모델링: 교통수단 선택 탭 (상단 고정)
 * 
 * 위치: Header 바로 아래
 * 역할: 기능만 존재 (상태 메시지 없음)
 */

import React from 'react';
import { HEADER_HEIGHT } from '@/layout/Header';

type TravelModeType = 'WALKING' | 'DRIVING' | 'TRANSIT';

interface TransportTabsProps {
  currentMode?: TravelModeType;
  onSelect: (mode: TravelModeType) => void;
}

export default function TransportTabs({ currentMode, onSelect }: TransportTabsProps) {
  const modes: { type: TravelModeType; label: string; icon: string }[] = [
    { type: 'DRIVING', label: '자동차', icon: '🚗' },
    { type: 'TRANSIT', label: '대중교통', icon: '🚇' },
    { type: 'WALKING', label: '도보', icon: '🚶' },
  ];

  return (
    <div
      className="bg-white border-b border-neutral-200 rounded-lg"
      style={{
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '0 16px',
        width: '100%',
      }}
    >
      {modes.map((mode) => {
        const isActive = currentMode === mode.type;
        return (
          <button
            key={mode.type}
            onClick={() => onSelect(mode.type)}
            className={`rounded-full px-4 py-2 text-sm font-medium active:scale-95 transition-transform ${
              isActive
                ? 'bg-black text-white'
                : 'bg-neutral-100 text-neutral-700'
            }`}
            style={{
              minHeight: '36px',
              minWidth: '80px',
            }}
          >
            {mode.icon} {mode.label}
          </button>
        );
      })}
    </div>
  );
}
