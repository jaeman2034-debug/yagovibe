/**
 * 🔥 Phase 27: 기억 설명 토스트
 * 
 * 사용자가 기억을 저장했을 때 왜 기억했는지 설명해주는 UX
 * 기술적 설명 없이 사람처럼 설명
 */
import React, { useEffect, useState } from 'react';

type Props = {
  isVisible: boolean;
  onTimeout?: () => void;
  timeout?: number; // 표시 시간 (ms)
};

export default function MemoryExplainToast({ 
  isVisible, 
  onTimeout,
  timeout = 2500 // 🔥 Phase 27: 2~3초 (기본값 2.5초)
}: Props) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      
      // 🔥 Phase 27: 2~3초 후 자동 사라짐
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

  // 🔥 Phase 27: 사람처럼 설명 (기술적 설명 금지)
  const messages = [
    '자주 찾으실 것 같아서 기억해뒀어요.',
    '이 근처에 오셨을 때 도움이 될 것 같아서요.',
    '다음에 빠르게 추천해드릴게요.',
  ];

  // 랜덤하게 하나 선택 (또는 첫 번째 고정)
  const message = messages[0]; // 🔥 Phase 27: 일관성을 위해 첫 번째 고정

  return (
    <div className="memory-explain-toast">
      {message}
    </div>
  );
}
