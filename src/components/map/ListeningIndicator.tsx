/**
 * 🔥 Phase 20: ListeningIndicator 컴포넌트
 * 
 * STT 상태를 사용자에게 명확하게 표시
 * "지금 말해도 됩니다" 상태 가시화 UX
 * 
 * 🔥 수정: idle 상태에서 클릭 가능 (STT 시작)
 */
import type { STTStatus } from '@/types/stt';

// 🔥 Phase 22: 상태별 UI 매핑 (확장)
const STATUS_MAP: Record<STTStatus, { text: string; color: string }> = {
  idle: { text: '🟢 지금 듣고 있어요', color: '#16a34a' }, // 🔥 "말해도 돼요" → "듣고 있어요" (능동 AI 존재감)
  listening: { text: '🔴 듣는 중…', color: '#dc2626' },
  understood: { text: '🤔 이해하는 중', color: '#2563eb' },
  searching: { text: '🔍 근처에서 찾는 중…', color: '#4b5563' },
  permission_denied: { text: '⚠️ 마이크 권한 필요', color: '#ca8a04' },
  error: { text: '⚠️ 음성 인식 불가', color: '#ca8a04' },
};

type Props = {
  status: STTStatus;
  onStartListening?: () => void; // 🔥 STT 시작 핸들러
  hasRecommendation?: boolean; // 🔥 추천 카드가 표시되어 있는지
  isNavigating?: boolean; // 🔥 길 안내가 시작되었는지
  isIdleCurious?: boolean; // 🔥 idle 상태 3초 경과 후 "관심" 상태
  isListening?: boolean; // 🔥 수정: 실제 마이크 활성화 상태
  phase?: 'IDLE' | 'SEARCHING' | 'CONFIRMED' | 'NAVIGATING' | 'ARRIVED'; // 🔥 phase 상태: IDLE이 아니면 숨김
};

export default function ListeningIndicator({ status, onStartListening, hasRecommendation = false, isNavigating = false, isIdleCurious = false, isListening = false, phase = 'IDLE' }: Props) {
  const ui = STATUS_MAP[status];
  
  // 🔥 천재 모드: SEARCHING 이상 phase에서는 무조건 숨김 (지도 시야 방해 방지)
  if (phase !== 'IDLE') {
    return null;
  }
  
  // 🔥 길 안내 중이면 표시하지 않음
  if (isNavigating) {
    return null;
  }
  
  // 🔥 idle 상태에서만 클릭 가능
  const isClickable = status === 'idle' && onStartListening !== undefined;
  
  // 🔥 천재 모드: STT 상태 머신 (idle → curious → suggest)
  // STATE 1: idle (기본 대기) - 존재 선언
  // STATE 2: curious (조용할 때) - 관심 표현
  // STATE 3: suggest (추천 후) - 음성 우선권 선언
  
  const getMainText = () => {
    // 🔥 수정: 실제로 listening 중일 때만 "지금 듣고 있어요" 표시
    if (status === 'listening' || (status === 'idle' && isListening)) {
      return '🟢 지금 듣고 있어요'; // 🔥 실제 마이크 활성화 상태
    }
    // STATE 3: suggest (추천 카드 표시됨)
    if (status === 'idle' && hasRecommendation) {
      return '🟢 말로 바로 바꿀 수 있어요'; // 🔥 음성 우선권 선언
    }
    // 🔥 세로 녹색 멘트 제거: "어디 가고 싶은지 궁금해요" 같은 세로 멘트는 표시하지 않음
    // STATE 1: idle (기본 대기) - 마이크 비활성 상태
    if (status === 'idle') {
      return '🟢 말해보세요'; // 🔥 가로 멘트는 유지 (검색창 위)
    }
    // 다른 상태는 기존 UI 사용
    return ui.text;
  };
  
  const getSubText = () => {
    // 🔥 서브 멘트: "떠오르는 장소 말해보세요" 추가
    if (status === 'idle') {
      return '떠오르는 장소 말해보세요';
    }
    return null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isClickable) return;
    
    e.stopPropagation(); // 이벤트 버블링 방지
    console.warn('[STT] button disabled (MVP)');
    return;
  };

  return (
    <div
      style={{
        position: 'fixed', // 🔥 검색창 바로 위에 위치
        top: 'calc(var(--header-h, 56px) + 60px)', // 🔥 검색창 바로 위 (검색창은 80px 아래)
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 701, // 🔥 검색창(zIndex: 700)보다 높게 설정하여 검색창 위에 표시되고 뒤에 숨어있지 않게
      }}
    >
      {/* 🔥 음성 파형 느낌의 breathing ring (idle일 때만) */}
      {status === 'idle' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            borderRadius: '999px',
            background: ui.color,
            opacity: 0.25,
            animation: 'breathingRing 2.5s ease-in-out infinite',
            zIndex: -1,
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        className="listening-indicator"
        style={{
          position: 'relative',
          padding: status === 'idle' ? '6px 14px' : '4px 10px', // 🔥 천재 모드: 세로 길이 15~20% 추가 축소 (공간 가르지 않게)
          borderRadius: '999px',
          background: ui.color,
          color: '#fff',
          fontSize: status === 'idle' ? '15px' : '14px', // 🔥 idle일 때 더 크게
          fontWeight: status === 'idle' ? '600' : '500', // 🔥 idle일 때 더 굵게
          cursor: isClickable ? 'pointer' : 'default',
          pointerEvents: isClickable ? 'auto' : 'none',
          boxShadow: status === 'idle' 
            ? '0 4px 16px rgba(22, 163, 74, 0.3)' // 🔥 idle일 때 더 강한 그림자
            : '0 2px 8px rgba(0, 0, 0, 0.2)',
          whiteSpace: 'nowrap', // 🔥 가로 멘트는 한 줄로 유지 (세로 멘트 제거)
          transition: 'all 0.4s ease', // 🔥 천천히 숨 쉬는 느낌 (0.3s → 0.4s)
          animation: status === 'idle' ? 'idleBreathing 2.5s ease-in-out infinite' : 'none', // 🔥 살아있는 breathing 애니메이션
          maxWidth: 'auto', // 🔥 가로 멘트는 한 줄로 유지 (너비 제한 제거)
          textAlign: 'center',
          // 🔥 천재 모드: 추천 카드 표시 시 opacity/크기 감소 (턴 전환 인식)
          opacity: status === 'idle' && hasRecommendation ? 0.7 : (status === 'idle' ? 1 : 0.95), // 🔥 추천 카드 표시 시 70% 투명도
          transform: status === 'idle' && hasRecommendation ? 'scale(0.95)' : 'scale(1)', // 🔥 추천 카드 표시 시 5% 축소
        }}
        onClick={handleClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick(e as any);
          }
        }}
      >
        {/* 🔥 검색창 바로 위에 1개 버튼만 표시 (메인 텍스트만) */}
        <div style={{ fontWeight: '600', fontSize: status === 'idle' ? '15px' : '14px' }}>
          {getMainText()}
        </div>
      </div>
      <style>{`
        @keyframes idleBreathing {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 16px rgba(22, 163, 74, 0.3);
            opacity: 1;
          }
          50% {
            transform: scale(1.03);
            box-shadow: 0 6px 24px rgba(22, 163, 74, 0.45);
            opacity: 0.95;
          }
        }
        @keyframes breathingRing {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.1;
          }
        }
      `}</style>
    </div>
  );
}
