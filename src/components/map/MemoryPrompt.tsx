/**
 * 🔥 Phase 26: 기억 질문 카드
 * 
 * 네비게이션 종료 후 사용자에게 기억할지 물어보는 UX
 */
import React from 'react';
import type { MapPlace } from '@/types/map';

type Props = {
  place: MapPlace | null;
  onAccept: () => void;
  onReject: () => void;
};

export default function MemoryPrompt({ place, onAccept, onReject }: Props) {
  if (!place) return null;

  return (
    <div className="memory-card">
      <div className="memory-card-title">
        다음에도 이 근처 오면<br />
        <b>{place.name}</b>을 추천할까요?
      </div>

      <div className="memory-card-actions">
        <button onClick={onAccept} className="memory-card-button-accept">
          기억해줘요
        </button>
        <button onClick={onReject} className="memory-card-button-reject">
          괜찮아요
        </button>
      </div>
    </div>
  );
}
