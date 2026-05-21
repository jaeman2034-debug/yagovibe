/**
 * 🔥 Phase 31: 도착 배너 (감정 설계)
 * 
 * 목적지 근처 도착 시 긍정적이고 성취감을 주는 메시지 표시
 * 안내가 끝날 때 좋은 기억이 남도록 설계
 */
import React, { useEffect, useState } from 'react';

type Props = {
  isVisible: boolean;
  onTimeout?: () => void;
  timeout?: number; // 표시 시간 (ms)
};

export default function ArrivalBanner({ 
  isVisible, 
  onTimeout,
  timeout = 2000 
}: Props) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      
      // 🔥 Phase 26: 2초 후 자동 사라짐
      const timer = setTimeout(() => {
        setShouldRender(false);
        onTimeout?.();
      }, timeout);

      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
  }, [isVisible, timeout, onTimeout]);

  if (!shouldRender) return null;

  return (
    <div className="arrival-banner">
      잘 도착했어요
    </div>
  );
}
