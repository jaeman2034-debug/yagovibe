/**
 * 🔥 Phase 28: 네비게이션 시작 확인 카드
 * 
 * "이제 안내를 시작할까요?" 실행 전 마지막 확인 UX
 * 통제권 100% 사용자에게
 * 
 * 천재의 선택:
 * - "시작할게요" 버튼만 유지 (명시적 동의)
 * - "잠깐만요"는 카드 닫기로 처리 (행동으로 표현)
 * - 아무 것도 안 누르면 그대로 유지 (자동 전환 없음)
 */
import React from 'react';

type Props = {
  onStart: () => void;
  onWait: () => void;
  recommendedPlace?: {
    name: string;
    distance?: number;
    address?: string;
  } | null;
  confirmedPlace?: {
    name: string;
    distance?: number;
    address?: string;
  } | null; // 🔥 CONFIRMED 상태: 확정된 목적지 (recommendedPlace보다 우선)
  onShowOther?: () => void; // 🔥 Phase 31: "다른 곳" 버튼 핸들러
  onSelectMode?: (mode: 'WALKING' | 'DRIVING' | 'TRANSIT') => void; // 🔥 Phase 32: 이동수단 선택 핸들러
};

export default function NavigationConfirmCard({ onStart, onWait, recommendedPlace, confirmedPlace, onShowOther, onSelectMode }: Props) {
  // 🔥 CONFIRMED 상태: confirmedPlace 우선 사용 (recommendedPlace보다 우선)
  const displayPlace = confirmedPlace || recommendedPlace;
  
  // 🔒 mount/unmount 로그: 렌더 트리에서 언마운트 여부 확인
  React.useEffect(() => {
    const placeId = displayPlace?.name || 'unknown';
    console.log('🟢 [NavigationConfirmCard] MOUNT', placeId, { hasConfirmed: !!confirmedPlace, hasRecommended: !!recommendedPlace });
    return () => {
      console.log('🔴 [NavigationConfirmCard] UNMOUNT', placeId);
    };
  }, [displayPlace?.name, confirmedPlace, recommendedPlace]);
  
  // 🔥 Phase 28: 진단용 - 클릭 타깃 확인 (회귀 문제 진단)
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      console.log("🔴 CLICK TARGET:", e.target);
      console.log("🔴 CLICK PATH:", e.composedPath());
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // 🔥 Phase 28: 진단용 - elementFromPoint 확인
  React.useEffect(() => {
    const checkElement = () => {
      const btn = document.querySelector('.nav-confirm-button-primary');
      if (btn) {
        const r = btn.getBoundingClientRect();
        const element = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
        console.log("🔴 elementFromPoint (버튼 중앙):", element);
      }
    };
    // 버튼이 렌더된 후 확인
    const timer = setTimeout(checkElement, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="nav-confirm-card-wrapper">
      <div className="nav-confirm-card">
        {/* 🔥 Phase 28: 닫기 버튼 (잠깐만요의 행동 표현) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // 🔥 Phase 28: 이벤트 버블링 방지
            onWait();
          }}
          className="nav-confirm-close"
          aria-label="닫기"
        >
          ×
        </button>
        
        <div className="nav-confirm-title">여기로 갈까요?</div>
        
        {/* 🔥 Phase 31: 장소 정보 표시 (confirmedPlace 우선, recommendedPlace fallback) */}
        {displayPlace && (
          <div className="nav-confirm-place-info">
            <div className="nav-confirm-place-name">🏟️ {displayPlace.name}</div>
            {displayPlace.distance && (
              <div className="nav-confirm-place-meta">
                {displayPlace.distance < 1000 
                  ? `${Math.round(displayPlace.distance)}m`
                  : `${(displayPlace.distance / 1000).toFixed(2)}km`
                }
                {displayPlace.address && ` · ${displayPlace.address}`}
              </div>
            )}
          </div>
        )}
        
        <div className="nav-confirm-sub">언제든 멈출 수 있어요</div>
        
        {/* 🔥 Phase 32: 이동수단 선택 버튼 (우선 표시) */}
        {onSelectMode ? (
          <div className="nav-confirm-actions">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🚶 [Phase32] 도보 선택');
                onSelectMode('WALKING');
              }}
              className="nav-confirm-button nav-confirm-button-primary"
            >
              🚶 도보
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🚗 [Phase32] 자동차 선택');
                onSelectMode('DRIVING');
              }}
              className="nav-confirm-button nav-confirm-button-secondary"
            >
              🚗 자동차
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🚌 [Phase32] 대중교통 선택');
                onSelectMode('TRANSIT');
              }}
              className="nav-confirm-button nav-confirm-button-secondary"
            >
              🚌 대중교통
            </button>
          </div>
        ) : (
          <div className="nav-confirm-actions">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // 🔥 Phase 28: 이벤트 버블링 방지
                onStart();
              }}
              className="nav-confirm-button nav-confirm-button-primary"
            >
              출발
            </button>
            {onShowOther && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // 🔥 Phase 31: 이벤트 버블링 방지
                  onShowOther();
                }}
                className="nav-confirm-button nav-confirm-button-secondary"
              >
                다른 곳
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
