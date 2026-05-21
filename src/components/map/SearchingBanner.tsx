/**
 * 🔥 Phase 24: SearchingBanner 컴포넌트
 * 
 * 검색 중 상태를 사용자에게 명확하게 표시
 * "멈춘 화면"이 아니라 "진행 중"임을 선언
 * 
 * 🔥 천재 모드: STT 오브젝트 근처로 이동 (발화 축 일관성)
 */
import React from 'react';

type Props = {
  isVisible: boolean;
  searchQuery?: string;
  hasRecommendation?: boolean; // 🔥 천재 모드: 추천 카드가 표시되면 사라지게
};

export default function SearchingBanner({ isVisible, searchQuery, hasRecommendation = false }: Props) {
  // 🔥 천재 모드: 추천 카드가 표시되면 즉시 사라짐 (턴 전환)
  if (!isVisible || hasRecommendation) return null;

  return (
    <div 
      className="searching-banner"
      style={{
        position: 'fixed', // 🔥 천재 모드: fixed로 변경
        top: 'calc(var(--header-h, 56px) + 80px)', // 🔥 STT 오브젝트 바로 아래 (발화 축 일관성)
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 29, // 🔥 검색 배너 레이어 (음성 인디케이터 바로 아래)
      }}
    >
      🔍 {searchQuery ? `"${searchQuery}" 근처에서 찾는 중…` : '근처에서 찾는 중…'}
    </div>
  );
}
