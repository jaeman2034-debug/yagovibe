/**
 * 🔥 Phase 24: SkeletonMarker 컴포넌트
 * 
 * 검색 중일 때 임시로 표시되는 가짜 마커
 * "어디서 찾고 있는지" 시각화 효과
 */
import React from 'react';

type Props = {
  position: { lat: number; lng: number };
};

export default function SkeletonMarker({ position }: Props) {
  return (
    <div
      className="skeleton-marker"
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}
