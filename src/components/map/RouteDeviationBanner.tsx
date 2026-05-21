/**
 * 🔥 Phase 30: 경로 이탈 자연스러운 피드백 배너
 * 
 * 경로에서 크게 벗어났을 때만 부드럽게 알림
 * 강요 없음, 자연스러운 복귀 유도
 */
import React, { useEffect, useState } from 'react';

type Props = {
  isVisible: boolean;
  onTimeout?: () => void;
  timeout?: number; // 표시 시간 (ms)
};

export default function RouteDeviationBanner({
  isVisible,
  onTimeout,
  timeout = 3000
}: Props) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);

      // 🔥 Phase 30: 3초 후 자동 사라짐
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
    <div className="route-deviation-banner">
      이 경로로 돌아오시면 돼요
    </div>
  );
}
