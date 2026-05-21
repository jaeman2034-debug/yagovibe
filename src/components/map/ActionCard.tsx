/**
 * 🔥 C 단계: ActionCard - 지도 밖 UX 연결
 * 
 * 역할: 지도 아래 Action 영역
 * 상태: idle | exploring | selected | error
 */

import React from 'react';

type ActionState = 'idle' | 'moving' | 'selected' | 'error' | 'idleCandidate'; // 🔥 STEP 4: idle 500ms 후 후보 상태

interface ActionCardProps {
  state: ActionState;
  placeName?: string;
  onNavigate?: () => void;
  onRetry?: () => void;
  isNavigating?: boolean; // 🔥 STEP 4: 버튼 연타 방지용
}

export default function ActionCard({ 
  state, 
  placeName, 
  onNavigate,
  onRetry,
  isNavigating = false // 🔥 STEP 4: 버튼 연타 방지용
}: ActionCardProps) {
  // 🔥 인터랙션 단계: 상태별 시각적 스타일
  const getCardStyle = () => {
    const baseStyle: React.CSSProperties = {
      marginTop: '16px', // 🔥 여백 리밸런싱: 지도 → Instruction 간격
      padding: '16px',
      borderRadius: '16px',
      background: '#F8F9FB', // 🔥 톤 다운: 지도보다 한 톤 낮은 배경
      border: '1px solid rgba(0, 0, 0, 0.03)', // 🔥 테두리 약하게
      transition: 'all 0.3s ease',
    };

    switch (state) {
      case 'idle':
        return {
          ...baseStyle,
          boxShadow: '0 3px 8px rgba(0, 0, 0, 0.02)', // 🔥 그림자 강도 60% (기존 80% → 60%)
          transform: 'scale(1)',
        };
      case 'moving':
        return {
          ...baseStyle,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          transform: 'scale(1)',
        };
      case 'selected':
        return {
          ...baseStyle,
          boxShadow: '0 12px 32px rgba(26, 115, 232, 0.15)',
          transform: 'scale(1.02)',
          border: '1px solid rgba(26, 115, 232, 0.2)',
        };
      case 'error':
        return {
          ...baseStyle,
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.05)',
          transform: 'scale(1)',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div 
      className="action-card"
      style={getCardStyle()}
    >
      {/* 🔥 천재 모드: idle 상태 안내 문구 제거 - 상황부 가이드로 전환 (STT 오브젝트에서만 표시) */}
      {/* 추천 카드가 뜨면 완전 제거되어야 하므로 여기서는 표시하지 않음 */}

      {state === 'idleCandidate' && (
        <div style={{ 
          textAlign: 'center', 
          color: '#666',
          fontSize: '14px',
          padding: '8px 0'
        }}>
          이 위치로 안내할까요?
        </div>
      )}

      {state === 'moving' && (
        <div style={{ 
          textAlign: 'center', 
          color: '#666',
          fontSize: '14px',
          padding: '8px 0'
        }}>
          이 위치 주변을 보고 있어요
        </div>
      )}

      {state === 'selected' && placeName && (
        <div
          style={{
            animation: 'fadeInUp 0.3s ease-out',
          }}
        >
          <div style={{ 
            marginBottom: '12px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#666',
            padding: '8px 0'
          }}>
            이 위치로 계속할까요?
          </div>
          <button
            onClick={onNavigate}
            disabled={isNavigating} // 🔥 STEP 4: 연타 방지
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: '8px',
              background: isNavigating ? '#9ca3af' : '#1a73e8', // 🔥 STEP 4: 비활성화 시 회색
              color: '#ffffff',
              border: 'none',
              fontSize: '15px',
              fontWeight: '500',
              cursor: isNavigating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isNavigating ? 'none' : '0 2px 8px rgba(26, 115, 232, 0.2)',
              opacity: isNavigating ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1557b0';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 115, 232, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a73e8';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(26, 115, 232, 0.2)';
            }}
          >
            여기로 안내할게요
          </button>
        </div>
      )}

      {state === 'error' && (
        <div>
          <div style={{ 
            marginBottom: '12px',
            textAlign: 'center',
            color: '#d32f2f',
            fontSize: '14px'
          }}>
            장소를 불러올 수 없어요
          </div>
          <button
            onClick={onRetry}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: '8px',
              background: '#f5f5f5',
              color: '#1a1a1a',
              border: '1px solid #e0e0e0',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#eeeeee';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
            }}
          >
            다시 시도하기
          </button>
        </div>
      )}
    </div>
  );
}
