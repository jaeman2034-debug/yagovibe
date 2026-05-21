/**
 * 🔥 Phase 22: RecognizedCaption 컴포넌트
 * 
 * STT로 인식된 문장을 1.5초간 표시하는 캡션
 * 사용자에게 "이해했다"는 즉각 피드백 제공
 */
import React, { useEffect, useState } from 'react';

type Props = {
  text: string | null;
  duration?: number; // 표시 시간 (ms)
};

export default function RecognizedCaption({ text, duration = 1500 }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (text) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [text, duration]);

  if (!show || !text) return null;

  return (
    <div className="recognized-caption">
      "{text}"
    </div>
  );
}
