/**
 * 🔥 Phase 27: 방향 힌트 메시지
 * 
 * "이쪽 방향이에요" 메시지를 2초간 표시
 * 길 안내 ❌ / 네비 ❌ / 방향만 보여주기 ⭕
 */
import React, { useEffect, useState } from 'react';

type Props = {
  isVisible: boolean;
  onTimeout?: () => void;
  timeout?: number; // 표시 시간 (ms)
};

export default function DirectionHintMessage({ 
  isVisible, 
  onTimeout,
  timeout = 2000 
}: Props) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      
      // 🔥 Phase 23: 2초 후 자동 사라짐
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
    <div className="direction-hint-message">
      이쪽 방향이에요
    </div>
  );
}
