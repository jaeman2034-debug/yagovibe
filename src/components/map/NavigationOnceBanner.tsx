/**
 * 🔥 Phase 25: 네비게이션 최초 1회 안내 배너
 * 
 * "이 경로로 가면 돼요." 메시지를 2초간 표시
 */
import React, { useEffect, useState } from 'react';

type Props = {
  isVisible: boolean;
  onTimeout?: () => void;
  timeout?: number; // 표시 시간 (ms)
};

export default function NavigationOnceBanner({ 
  isVisible, 
  onTimeout,
  timeout = 2000 
}: Props) {
  const [shouldRender, setShouldRender] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (isVisible && !hasShown) {
      setShouldRender(true);
      setHasShown(true);
      
      // 🔥 Phase 25: 2초 후 자동 사라짐
      const timer = setTimeout(() => {
        setShouldRender(false);
        onTimeout?.();
      }, timeout);

      return () => clearTimeout(timer);
    } else if (!isVisible) {
      setShouldRender(false);
    }
  }, [isVisible, hasShown, timeout, onTimeout]);

  if (!shouldRender) return null;

  return (
    <div className="nav-once-banner">
      이 경로로 가면 돼요
    </div>
  );
}
