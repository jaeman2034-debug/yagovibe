/**
 * 🔥 Phase 21: ActionNudgeBubble - 실전 행동 유도 UX
 * 
 * 책임 범위:
 * ✅ "이렇게 말하면 됩니다" 힌트 제공
 * ✅ 사용자가 말하기 시작하면 즉시 사라짐
 * ✅ 3-5초 후 자동 페이드아웃
 * 
 * 원칙:
 * - 버튼 누르라고 하지 않음
 * - 설명을 길게 하지 않음
 * - "말 예시"만 던지고 사라짐
 */

import { useEffect, useState } from 'react';

interface ActionNudgeBubbleProps {
  isListening: boolean;
  hasSpoken: boolean; // 사용자가 말하기 시작했는지
  hasResults: boolean; // 검색 결과가 있는지
  onDismiss?: () => void;
}

const HINT_EXAMPLES = [
  "예: 근처 축구장 찾아줘",
  "예: 여기서 제일 가까운 곳은?",
  "예: 조용한 카페 추천해줘",
  "예: 내 주변 헬스장",
  "예: 여기 근처 운동장",
];

export default function ActionNudgeBubble({
  isListening,
  hasSpoken,
  hasResults,
  onDismiss,
}: ActionNudgeBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentHint, setCurrentHint] = useState('');

  // 🔥 Phase 21: 표시 조건
  const shouldShow = isListening && !hasSpoken && !hasResults;

  // 🔥 Phase 21: 힌트 선택 (랜덤)
  useEffect(() => {
    if (shouldShow && !isVisible) {
      const randomHint = HINT_EXAMPLES[Math.floor(Math.random() * HINT_EXAMPLES.length)];
      setCurrentHint(randomHint);
      setIsVisible(true);

      // 🔥 5초 후 자동 페이드아웃
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [shouldShow, isVisible, onDismiss]);

  // 🔥 Phase 21: 말하기 시작하거나 결과가 나오면 즉시 사라짐
  useEffect(() => {
    if (hasSpoken || hasResults) {
      setIsVisible(false);
    }
  }, [hasSpoken, hasResults]);

  if (!shouldShow || !isVisible) {
    return null;
  }

  return (
    <div className="action-nudge-bubble">
      <div className="action-nudge-content">
        {currentHint}
      </div>
    </div>
  );
}
