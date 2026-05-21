/**
 * 🔥 Phase 25: 추천 선언 배너 (개선)
 * 
 * 검색 결과 중 추천 장소 1곳을 명확하게 선언하는 UX
 * "결과를 나열하지 말고, 지도가 '이곳'을 먼저 집어준다"
 */
import React, { useEffect, useState } from 'react';

type MapPlace = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

type Props = {
  place: MapPlace | null | undefined;
  showDelay?: number; // 표시 딜레이 (ms)
};

export default function RecommendationBanner({ place, showDelay = 300 }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!place) {
      setIsVisible(false);
      return;
    }

    // 🔥 Phase 25: 검색 완료 후 0.3초 딜레이로 표시
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, showDelay);

    return () => clearTimeout(timer);
  }, [place, showDelay]);

  if (!place || !isVisible) return null;

  return (
    <div className="recommend-banner">
      가장 가까운 곳은 <b>{place.name || '여기'}</b>예요
    </div>
  );
}
