import { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';

type MicState = 'idle' | 'longPressing' | 'dragging' | 'actionTriggered';

type DragDirection = 'up' | 'down' | 'left' | 'right' | null;

interface DraggableMicButtonProps {
  onVoiceInput?: () => void;
  onAIAssist?: () => void;
  onVoiceSettings?: () => void;
}

/**
 * 🎤 드래그 기반 마이크 UX 컴포넌트
 * 
 * 상태 머신:
 * idle → longPressing (500ms) → dragging → actionTriggered → idle
 * 
 * 드래그 방향별 액션:
 * - 위: 음성 입력 도움
 * - 아래: AI 도움말
 * - 좌측: 음성 기능 설정
 * - 우측: 아무것도 없음 (실수 방지)
 */
export function DraggableMicButton({
  onVoiceInput,
  onAIAssist,
  onVoiceSettings,
}: DraggableMicButtonProps) {
  const [state, setState] = useState<MicState>('idle');
  const [dragDirection, setDragDirection] = useState<DragDirection>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hintTextRef = useRef<HTMLDivElement>(null);

  // Long Press 감지 (500ms)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const clientX = e.clientX;
    const clientY = e.clientY;
    setStartPos({ x: clientX, y: clientY });

    // 햅틱 피드백 (모바일)
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    longPressTimerRef.current = setTimeout(() => {
      setState('longPressing');

      // 힌트 텍스트 표시
      if (hintTextRef.current) {
        hintTextRef.current.style.opacity = '1';
      }

      // 햅틱 피드백
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (state === 'longPressing' || state === 'dragging') {
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 최소 드래그 거리 (20px)
      if (distance > 20) {
        setState('dragging');

        // 드래그 방향 감지
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absY > absX) {
          // 수직 드래그
          setDragDirection(deltaY < 0 ? 'up' : 'down');
        } else {
          // 수평 드래그
          setDragDirection(deltaX < 0 ? 'left' : 'right');
        }

        // 드래그 오프셋 업데이트 (부드러운 추적)
        setDragOffset({
          x: deltaX * 0.3,
          y: deltaY * 0.3,
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Long Press 타이머 취소
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (state === 'dragging' && dragDirection) {
      // 드래그 방향별 액션 실행
      setState('actionTriggered');

      switch (dragDirection) {
        case 'up':
          // 음성 입력 도움
          if (onVoiceInput) {
            onVoiceInput();
          }
          break;
        case 'down':
          // AI 도움말
          if (onAIAssist) {
            onAIAssist();
          }
          break;
        case 'left':
          // 음성 기능 설정
          if (onVoiceSettings) {
            onVoiceSettings();
          }
          break;
        case 'right':
          // 아무것도 없음 (실수 방지)
          break;
      }

      // 햅틱 피드백
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }

      // 300ms 후 원위치 복귀
      setTimeout(() => {
        setState('idle');
        setDragDirection(null);
        setDragOffset({ x: 0, y: 0 });
        if (hintTextRef.current) {
          hintTextRef.current.style.opacity = '0';
        }
      }, 300);
    } else if (state === 'longPressing') {
      // Long Press만 하고 드래그 안 함 → 취소
      setState('idle');
      if (hintTextRef.current) {
        hintTextRef.current.style.opacity = '0';
      }
    } else {
      // 일반 클릭 → 취소
      setState('idle');
    }
  };

  // 호버 효과
  const [isHovered, setIsHovered] = useState(false);

  // 드래그 방향별 힌트 텍스트
  const getHintText = () => {
    if (state === 'dragging' && dragDirection) {
      switch (dragDirection) {
        case 'up':
          return '말로 입력해보세요';
        case 'down':
          return 'AI가 도와줄 수 있는 것';
        case 'left':
          return '음성 기능 설정';
        case 'right':
          return '';
        default:
          return '드래그해서 선택하세요';
      }
    }
    return '드래그해서 선택하세요';
  };

  // 상태별 스타일
  const getButtonStyle = () => {
    const baseStyle = 'fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 cursor-grab active:cursor-grabbing';
    
    switch (state) {
      case 'idle':
        return `${baseStyle} opacity-25 hover:opacity-60`;
      case 'longPressing':
        return `${baseStyle} opacity-80 scale-110`;
      case 'dragging':
        return `${baseStyle} opacity-100 scale-125`;
      case 'actionTriggered':
        return `${baseStyle} opacity-100 scale-110`;
      default:
        return baseStyle;
    }
  };

  // 반경 가이드 원 (Long Press 시 표시)
  const showGuideCircle = state === 'longPressing' || state === 'dragging';

  return (
    <>
      <button
        ref={buttonRef}
        className={getButtonStyle()}
        style={{
          backgroundColor: 'transparent',
          transform: state === 'dragging' 
            ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` 
            : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Mic 
          className={`w-6 h-6 text-gray-600 ${isHovered && state === 'idle' ? 'scale-110' : ''}`}
          strokeWidth={2}
        />
      </button>

      {/* 반경 가이드 원 */}
      {showGuideCircle && (
        <div
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full border-2 border-blue-400 border-dashed pointer-events-none animate-pulse"
          style={{
            transform: 'translate(50%, 50%)',
            marginRight: '-32px',
            marginBottom: '-32px',
          }}
        />
      )}

      {/* 힌트 텍스트 */}
      <div
        ref={hintTextRef}
        className="fixed bottom-20 right-6 bg-white px-4 py-2 rounded-lg shadow-lg text-sm text-gray-700 pointer-events-none transition-opacity duration-300"
        style={{ opacity: 0 }}
      >
        {getHintText()}
      </div>
    </>
  );
}

