/**
 * 🔥 통합 네비게이션 카드
 * 
 * CONFIRMED와 NAVIGATING 상태를 하나의 카드로 처리
 * - 카드는 항상 살아 있고, mode만 바뀜
 * - destination은 절대 건드리지 않음
 */

import React from 'react';

type NavigationMode = 'CONFIRMED' | 'PRE_NAVIGATING' | 'NAVIGATING' | 'ARRIVED';

type Props = {
  place: {
    name: string;
    distance?: number;
    address?: string;
  };
  mode: NavigationMode;
  routeInfo?: { distance: string; duration: string } | null; // 🔥 네비 UI: 경로 정보 (거리, 시간)
  isRouteCalculating?: boolean; // 🔥 네비 UI: 경로 계산 중 여부
  routeFailedReason?: 'ZERO_RESULTS' | 'NOT_FOUND' | 'ERROR' | null; // 🔥 네비 UI: 경로 실패 이유
  disabled?: boolean; // 🔥 2단계: GPS 없을 때 출발 버튼 비활성화
  disabledReason?: string; // 🔥 비활성화 이유 메시지
  onStart?: () => void;
  onStop?: () => void;
  onStopConfirm?: () => void; // 🔥 종료 확인 다이얼로그 표시용
  onWait?: () => void;
  onShowOther?: () => void;
  onGoToMarket?: () => void; // 🔥 ARRIVED 상태: 주변 상품 보기
  onTestArrive?: () => void; // 🔥 테스트용: 도착 처리 버튼
  onSearchNearby?: (keyword: string) => void; // ✅ MVP: ARRIVED 상태에서 주변 검색 (편의점, 카페, 주차장)
  onTryWalking?: () => void; // 🔥 도보 경로 시도 (ZERO_RESULTS 시)
};

export default function NavigationCard({
  place,
  mode,
  routeInfo,
  isRouteCalculating = false,
  routeFailedReason = null, // 🔥 네비 UI: 경로 실패 이유
  disabled = false, // 🔥 2단계: GPS 없을 때 출발 버튼 비활성화
  disabledReason, // 🔥 비활성화 이유 메시지
  onStart,
  onStop,
  onStopConfirm,
  onWait,
  onShowOther,
  onGoToMarket,
  onTestArrive,
  onSearchNearby,
  onTryWalking, // 🔥 도보 경로 시도
}: Props) {
  const [showStopConfirm, setShowStopConfirm] = React.useState(false);
  const [showStartFeedback, setShowStartFeedback] = React.useState(false);
  
  // 🔒 mount/unmount 로그
  React.useEffect(() => {
    console.log('🟢 [NavigationCard] MOUNT', place.name, mode);
    return () => {
      console.log('🔴 [NavigationCard] UNMOUNT', place.name, mode);
    };
  }, [place.name, mode]);
  
  // 🔥 상태 전환 피드백: CONFIRMED → NAVIGATING 전환 시 토스트 표시
  React.useEffect(() => {
    if (mode === 'NAVIGATING' && !showStartFeedback) {
      setShowStartFeedback(true);
      const timer = setTimeout(() => {
        setShowStartFeedback(false);
      }, 2000); // 2초 후 자동 사라짐
      return () => clearTimeout(timer);
    } else if (mode !== 'NAVIGATING') {
      setShowStartFeedback(false);
    }
  }, [mode, showStartFeedback]);

  // PRE_NAVIGATING 모드: 출발 대기 카드 (경로 계산 완료 후 출발 버튼)
  if (mode === 'PRE_NAVIGATING') {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '500px',
          zIndex: 800,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(26, 115, 232, 0.2)',
          animation: 'fadeInUp 0.3s ease-out',
        }}
      >
        {/* 목적지 이름 */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a73e8',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          🎯 {place.name}까지
        </div>
        
        {/* 거리/시간 정보 또는 실패 메시지 */}
        {routeInfo ? (
          <div
            style={{
              fontSize: '14px',
              color: '#666',
              textAlign: 'center',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            {routeInfo.duration && (
              <span>⏱ {routeInfo.duration}</span>
            )}
            {routeInfo.distance && (
              <span>📏 {routeInfo.distance}</span>
            )}
          </div>
        ) : routeFailedReason ? (
          <div
            style={{
              fontSize: '14px',
              color: '#d32f2f',
              textAlign: 'center',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#ffebee',
              borderRadius: '8px',
            }}
          >
            {routeFailedReason === 'ERROR' ? (
              <>
                ⚠️ 현재 위치를 확인할 수 없습니다
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  위치 권한을 확인하거나 잠시 후 다시 시도해 주세요
                </div>
              </>
            ) : routeFailedReason === 'ZERO_RESULTS' ? (
              <>
                ⚠️ 현재 위치는 차량 도로와 연결되지 않았어요
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  도보 경로를 이용하거나 도로로 이동해 주세요
                </div>
                {/* 🔥 도보 경로 제안 버튼 */}
                {onTryWalking && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('[NavigationCard] 도보 경로 시도');
                      onTryWalking();
                    }}
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      background: '#f5f5f5',
                      color: '#1a1a1a',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e8e8e8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                    }}
                  >
                    🚶 도보로 안내할까요?
                  </button>
                )}
              </>
            ) : routeFailedReason === 'NOT_FOUND' ? (
              <>
                ⚠️ 목적지를 찾을 수 없습니다
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  다른 위치를 선택해 주세요
                </div>
              </>
            ) : (
              <>
                ⚠️ 지도 서비스 오류가 발생했습니다
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  잠시 후 다시 시도해 주세요
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            style={{
              fontSize: '14px',
              color: '#666',
              textAlign: 'center',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid rgba(26, 115, 232, 0.3)',
                borderTopColor: '#1a73e8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            경로 계산 중...
          </div>
        )}
        
        {/* 출발 버튼 (경로 계산 완료 후만 활성화, 실패 시 비활성화) */}
        {onStart && routeInfo && !routeFailedReason && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              console.log('[FORCE] PRE_NAVIGATING 출발 버튼 클릭');
              onStart();
            }}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: '10px',
              background: '#1a73e8',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1557b0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a73e8';
            }}
          >
            출발
          </button>
        )}
        
        <style>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  // CONFIRMED 모드: 출발 전 확인 카드
  if (mode === 'CONFIRMED') {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '500px',
          zIndex: 800, // 🔥 레이어 우선순위: Header(1000) > Voice(900) > NavigationCard(800) > Map(0)
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          animation: 'fadeInUp 0.3s ease-out',
        }}
      >
        {/* ✅ MVP: 취소 버튼 (SEARCHING 복귀) */}
        {onWait && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWait();
            }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0, 0, 0, 0.05)',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: '1',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="취소"
          >
            ×
          </button>
        )}
        
        {/* 제목 */}
        <div
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1a1a1a',
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          여기로 갈까요?
        </div>
        
        {/* 장소 정보 */}
        <div
          style={{
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a73e8',
              marginBottom: '6px',
              textAlign: 'center',
            }}
          >
            🏟️ {place.name}
          </div>
          {(place.distance !== undefined || place.address) && (
            <div
              style={{
                fontSize: '13px',
                color: '#666',
                textAlign: 'center',
              }}
            >
              {place.distance !== undefined && (
                <span>
                  {place.distance < 1000 
                    ? `${Math.round(place.distance)}m`
                    : `${(place.distance / 1000).toFixed(2)}km`
                  }
                </span>
              )}
              {place.distance !== undefined && place.address && ' · '}
              {place.address && <span>{place.address}</span>}
            </div>
          )}
        </div>
        
        {/* 안내 문구 */}
        <div
          style={{
            fontSize: '13px',
            color: '#999',
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          언제든 멈출 수 있어요
        </div>
        
        {/* 버튼 */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          {onStart && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('[FORCE] NAV CARD BUTTON CLICKED - onStart called');
                onStart();
              }}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '10px',
                background: '#1a73e8',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1557b0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1a73e8';
              }}
            >
              여기에 갈게요
            </button>
          )}
          {onShowOther && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShowOther();
              }}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '10px',
                background: '#f5f5f5',
                color: '#1a1a1a',
                fontSize: '15px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e5e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
            >
              다른 곳
            </button>
          )}
        </div>
        
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  // NAVIGATING 모드: 내비게이션 중 카드 (더 컴팩트하고 진행 중 느낌)
  return (
    <>
      {/* 🔥 Step 3: 경로 계산 중 상태 표시 */}
      {isRouteCalculating && !routeInfo && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '500px',
            zIndex: 800,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            animation: 'fadeInUp 0.3s ease-out',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a73e8',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            🎯 {place.name}
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#666',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid rgba(26, 115, 232, 0.3)',
                borderTopColor: '#1a73e8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            경로 계산 중...
          </div>
          <style>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateX(-50%) translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
              }
            }
          `}</style>
        </div>
      )}
      
      {/* 🔥 상태 전환 피드백 토스트 */}
      {showStartFeedback && (
        <div
          style={{
            position: 'fixed',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeInDown 0.3s ease-out',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span>✔</span>
          <span>안내를 시작할게요</span>
        </div>
      )}
      
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '500px',
          zIndex: 800, // 🔥 레이어 우선순위: Header(1000) > Voice(900) > NavigationCard(800) > Map(0)
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '14px 18px', // 🔥 CONFIRMED보다 약간 작게 (진행 중 느낌)
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(26, 115, 232, 0.2)', // 🔥 파란색 테두리로 진행 중 강조
          animation: 'slideUp 0.3s ease-out',
          // 🔥 position은 이미 위에서 'fixed'로 설정됨 (중복 제거)
        }}
      >
      {/* 목적지 이름 (더 강조) */}
      <div
        style={{
          fontSize: '15px',
          fontWeight: '600',
          color: '#1a73e8',
          marginBottom: '6px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '18px' }}>🚗</span>
        <span>{place.name}</span>
      </div>
      
      {/* 목적지 상세 정보 (거리/주소) */}
      {(place.distance !== undefined || place.address) && (
        <div
          style={{
            fontSize: '13px',
            color: '#666',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          {place.distance !== undefined && (
            <span>
              {place.distance < 1000 
                ? `${Math.round(place.distance)}m`
                : `${(place.distance / 1000).toFixed(2)}km`
              }
            </span>
          )}
          {place.distance !== undefined && place.address && ' · '}
          {place.address && <span>{place.address}</span>}
        </div>
      )}
      
      {/* 내비게이션 중 상태 (진행감 강조) */}
      <div
        style={{
          fontSize: '12px',
          color: '#1a73e8',
          textAlign: 'center',
          marginBottom: '10px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        <span>🚗</span>
        <span>이동 중…</span>
      </div>
      
      {/* 🔥 네비 UI: 경로 정보 표시 (거리/시간) */}
      {routeInfo && (
        <div
          style={{
            fontSize: '13px',
            color: '#666',
            textAlign: 'center',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {routeInfo.distance && (
            <span>
              {routeInfo.distance}
            </span>
          )}
          {routeInfo.distance && routeInfo.duration && (
            <span style={{ color: '#999' }}>·</span>
          )}
          {routeInfo.duration && (
            <span>
              {routeInfo.duration}
            </span>
          )}
        </div>
      )}
      
      {/* 종료 확인 다이얼로그 */}
      {showStopConfirm && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStopConfirm(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              width: 'calc(100% - 40px)',
              maxWidth: '300px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '12px',
                textAlign: 'center',
              }}
            >
              안내를 종료할까요?
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              <button
                onClick={() => {
                  setShowStopConfirm(false);
                  if (onStop) onStop();
                }}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#f5f5f5',
                  color: '#1a1a1a',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                종료
              </button>
              <button
                onClick={() => setShowStopConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#1a73e8',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                계속 안내
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 테스트용 도착 처리 버튼 (개발 환경에서만 표시) */}
      {onTestArrive && process.env.NODE_ENV === 'development' && (
        <button
          onClick={onTestArrive}
          style={{
            width: '100%',
            padding: '10px 20px',
            borderRadius: '8px',
            background: '#22c55e',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '8px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#16a34a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#22c55e';
          }}
        >
          (테스트) 도착 처리
        </button>
      )}
      
      {/* 중지 버튼 */}
      {onStop && !showStopConfirm && (
        <button
          onClick={() => {
            if (onStopConfirm) {
              onStopConfirm();
            } else {
              setShowStopConfirm(true);
            }
          }}
          style={{
            width: '100%',
            padding: '12px 24px',
            borderRadius: '10px',
            background: '#f5f5f5',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e5e5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f5f5f5';
          }}
        >
          안내 그만할게요
        </button>
      )}
      
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  );
  
  // ARRIVED 모드: 도착 카드 (위치 정보 유지 + 이미지는 보조)
  if (mode === 'ARRIVED') {
    return (
      <>
        {/* 🔥 ARRIVED 상태: 목적지 정보 카드는 항상 유지 (지도 위에 표시) */}
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '500px',
            zIndex: 800, // 🔥 레이어 우선순위: Header(1000) > Voice(900) > NavigationCard(800) > Map(0)
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '18px 20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)', // 🔥 초록색 테두리로 도착 강조
            animation: 'fadeInUp 0.3s ease-out',
          }}
        >
          {/* 목적지 이름 (강조) */}
          <div
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#22c55e',
              marginBottom: '8px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '18px' }}>📍</span>
            <span>{place.name}</span>
          </div>
          
          {/* 도착 상태 */}
          <div
            style={{
              fontSize: '14px',
              color: '#22c55e',
              textAlign: 'center',
              marginBottom: '16px',
              fontWeight: '500',
            }}
          >
            목적지에 도착했습니다.
          </div>
          
          {/* ✅ MVP: 확인 버튼 (안내 종료 → IDLE) */}
          {onStop && (
            <button
              onClick={onStop}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '10px',
                background: '#22c55e',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#16a34a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#22c55e';
              }}
            >
              확인
            </button>
          )}
          
          {/* ✅ MVP: 주변 보기 버튼 (도착 지점 기준 SEARCHING) */}
          {onGoToMarket && (
            <button
              onClick={onGoToMarket}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '10px',
                background: '#f5f5f5',
                color: '#1a1a1a',
                fontSize: '15px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
                marginTop: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e5e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
            >
              주변 보기
            </button>
          )}
          
          {/* ✅ MVP: QuickActions (편의점, 카페, 주차장) */}
          {onSearchNearby && (
            <>
              {/* 구분선 */}
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  margin: '16px 0',
                }}
              />
              
              {/* QuickActions 제목 */}
              <div
                style={{
                  fontSize: '13px',
                  color: '#666',
                  textAlign: 'center',
                  marginBottom: '12px',
                  fontWeight: '500',
                }}
              >
                빠른 검색
              </div>
              
              {/* QuickActions 버튼 그룹 */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => onSearchNearby('편의점')}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#f8f9fa',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e9ecef';
                    e.currentTarget.style.borderColor = '#22c55e';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                  }}
                >
                  🏪 편의점
                </button>
                <button
                  onClick={() => onSearchNearby('카페')}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#f8f9fa',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e9ecef';
                    e.currentTarget.style.borderColor = '#22c55e';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                  }}
                >
                  ☕ 카페
                </button>
                <button
                  onClick={() => onSearchNearby('주차장')}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#f8f9fa',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e9ecef';
                    e.currentTarget.style.borderColor = '#22c55e';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                  }}
                >
                  🅿️ 주차장
                </button>
              </div>
            </>
          )}
          
          <style>{`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateX(-50%) translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
              }
            }
          `}</style>
        </div>
      </>
    );
  }
  
  // 기본값 (발생하지 않아야 함)
  return null;
}
