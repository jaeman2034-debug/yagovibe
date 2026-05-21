/**
 * 🔥 Phase 29: STT 결과 즉각 반응 카드
 * 
 * "알겠어요. 근처 [검색어]를 찾아볼게요." 메시지 표시
 * 사용자가 말을 끝낸 순간 즉각 피드백 제공
 * 
 * 위치: 화면 하단 (Phase 28 카드와 같은 자리)
 * 타이밍: 1.2초 후 자동 사라짐 → 검색 트리거
 */

import React, { useEffect, useState } from 'react';

type Props = {
  isVisible: boolean;
  searchQuery: string;
  onTimeout?: () => void;
  timeout?: number; // 표시 시간 (ms)
};

export default function STTResponseBanner({
  isVisible,
  searchQuery,
  onTimeout,
  timeout = 1200, // 🔥 Phase 29: 1.2초 후 자동 사라짐 → 검색 트리거
}: Props) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible && searchQuery.trim()) {
      setShouldRender(true);

      // 🔥 Phase 29: 1.2초 후 자동 사라짐 → 검색 트리거
      const timer = setTimeout(() => {
        setShouldRender(false);
        onTimeout?.();
      }, timeout);

      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
  }, [isVisible, searchQuery, timeout, onTimeout]);

  if (!shouldRender || !searchQuery.trim()) return null;

  return (
    <div className="speech-ack-card">
      알겠어요. 근처 <b>{searchQuery}</b>을(를) 찾아볼게요.
    </div>
  );
}
