/**
 * 🔥 Phase 24: EmptyResultMessage 컴포넌트
 * 
 * 검색 결과가 없을 때 자연스럽게 복귀 유도
 * 실패/오류가 아닌 "다시 말해보세요" 메시지
 */
import React, { useEffect, useState } from 'react';

type Props = {
  isVisible: boolean;
  onDismiss?: () => void;
};

export default function EmptyResultMessage({ isVisible, onDismiss }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      // 5초 후 자동으로 사라짐
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, onDismiss]);

  if (!show) return null;

  return (
    <div className="empty-result-message">
      근처에서는 찾지 못했어요.<br />
      다른 장소를 말해보세요.
    </div>
  );
}
