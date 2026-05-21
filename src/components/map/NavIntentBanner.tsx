/**
 * 🔥 Phase 26: 네비게이션 의도 피드백 배너
 * 
 * 사용자가 "가겠다"는 의도를 표현했을 때 "받아들였다"는 신호만 표시
 * 지도는 아직 변화 없음 - 의도만 확정
 */
import React, { useEffect, useState } from 'react';

type Props = {
  isVisible: boolean;
  onTimeout?: () => void;
  timeout?: number; // 표시 시간 (ms)
};

export default function NavIntentBanner({ 
  isVisible, 
  onTimeout,
  timeout = 2000 
}: Props) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      
      // 🔥 Phase 22: 2초 후 자동 사라짐
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
    <div className="nav-intent-banner">
      좋아요. 여기로 갈게요.
    </div>
  );
}
