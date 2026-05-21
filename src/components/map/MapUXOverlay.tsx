/**
 * 🔥 MapUXOverlay - 지도 위 UX 레이어 (통합)
 * 
 * 책임 범위:
 * ✅ 검색 결과 → 추천 → 실행 → 상태 흐름 관리
 * ✅ 지도 위 overlay UI 통합
 * 
 * ❌ 하지 않는 것:
 * - 지도 렌더링 (MapPageV3 책임)
 * - 검색 로직 (MapController 책임)
 */

import React, { useState } from 'react';
import MapResultPanel from './MapResultPanelV2';
import MapActionPanel from './MapActionPanel';
import ListeningIndicator from './ListeningIndicator';
import RecommendationBanner from './RecommendationBanner'; // 🔥 Phase 21: 추천 선언 배너
import NavIntentBanner from './NavIntentBanner'; // 🔥 Phase 22: 네비게이션 의도 피드백 배너
import DirectionHintMessage from './DirectionHintMessage'; // 🔥 Phase 23: 방향 힌트 메시지
import NavigationConfirmCard from './NavigationConfirmCard'; // 🔥 Phase 24: 네비게이션 시작 확인 카드
import NavigationOnceBanner from './NavigationOnceBanner'; // 🔥 Phase 25: 네비게이션 최초 1회 안내 배너
import ArrivalBanner from './ArrivalBanner'; // 🔥 Phase 26: 도착 배너
import RouteDeviationBanner from './RouteDeviationBanner'; // 🔥 Phase 30: 경로 이탈 배너
import MemoryPrompt from './MemoryPrompt'; // 🔥 Phase 26: 기억 질문 카드
import MemoryExplainToast from './MemoryExplainToast'; // 🔥 Phase 27: 기억 설명 토스트
import ListeningPulse from './ListeningPulse'; // 🔥 Phase 21: Idle 파동 애니메이션
import RecognizedCaption from './RecognizedCaption'; // 🔥 Phase 22: 인식된 문장 캡션
import SearchingBanner from './SearchingBanner'; // 🔥 Phase 24: 검색 중 배너
import EmptyResultMessage from './EmptyResultMessage'; // 🔥 Phase 24: 결과 없음 메시지
import STTResponseBanner from './STTResponseBanner'; // 🔥 Phase 29: STT 결과 즉각 반응 배너
import type { STTStatus } from '@/types/stt';
import { isMobileLikeDevice } from '@/utils/location'; // 🔥 Phase 29.5: 모바일 판별

type MapPlace = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

// 🔥 Phase 22: 지도 상단 타이틀 (STT 상태에 따라 변경)
function MapTitle({ sttStatus }: { sttStatus: STTStatus }) {
  const getTitle = () => {
    switch (sttStatus) {
      case 'listening':
        return '👂 듣고 있어요…';
      case 'processing':
        return '🧠 이해 중이에요…';
      case 'error':
        return '⚠️ 다시 말해주세요';
      default:
        return '지금 말하면 찾아드립니다';
    }
  };

  return (
    <div className="map-title">
      {getTitle()}
    </div>
  );
}

// 🔥 Phase 16: 디버그 오버레이 컴포넌트 (개발 모드 전용)
function DebugOverlay({
  places,
  recommended,
  navigationStarted,
  showMemoryPrompt,
  searchQuery,
}: {
  places: MapPlace[];
  recommended?: MapPlace | null;
  navigationStarted: boolean;
  showMemoryPrompt: boolean;
  searchQuery: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute top-4 left-4 pointer-events-auto z-[100]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-yellow-100 border border-yellow-400 rounded px-2 py-1 text-xs font-medium hover:bg-yellow-200 transition-colors"
      >
        {isExpanded ? '▼ Debug' : '▶ Debug'}
      </button>
      {isExpanded && (
        <div className="mt-2 bg-yellow-50 border border-yellow-400 rounded p-3 text-xs space-y-1 min-w-[200px]">
          <div className="font-semibold text-yellow-900 mb-2">Phase 16 Debug</div>
          <div className="space-y-1 text-yellow-800">
            <div>places: <span className="font-mono">{places.length}</span></div>
            <div>recommended: <span className="font-mono">{recommended?.name || 'null'}</span></div>
            <div>navigationStarted: <span className="font-mono">{navigationStarted ? 'true' : 'false'}</span></div>
            <div>showMemoryPrompt: <span className="font-mono">{showMemoryPrompt ? 'true' : 'false'}</span></div>
            <div>searchQuery: <span className="font-mono">{searchQuery || '(empty)'}</span></div>
            {recommended && (
              <div className="mt-2 pt-2 border-t border-yellow-300">
                <div className="text-yellow-700 font-medium">추천 상세:</div>
                <div className="text-yellow-600">ID: {recommended.id}</div>
                <div className="text-yellow-600">위치: ({recommended.lat.toFixed(4)}, {recommended.lng.toFixed(4)})</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type MapUXOverlayProps = {
  places: MapPlace[];
  recommended?: MapPlace | null;
  navigationStarted: boolean;
  routePath?: google.maps.LatLngLiteral[]; // 🔥 Phase 9: 경로 좌표 (MapPageV3에서 처리)
  routeInfo?: { distance: string; duration: string } | null; // 🔥 Phase 33: 경로 정보 (거리, 시간)
  showMemoryPrompt?: boolean; // 🔥 Phase 10: 기억 질문 표시 여부
  showAutoSuggestion?: boolean; // 🔥 Phase 13: 자동 제안 표시 여부
  recommendationReason?: string; // 🔥 Phase 11: 추천 이유
  searchQuery?: string; // 🔥 Phase 16: 검색어 (빈 상태 메시지 조건부 표시용)
  onSelectPlace: (place: MapPlace) => void;
  onNavigate: () => void;
  onReset: () => void;
  onSaveMemory?: () => void; // 🔥 Phase 10: 기억 저장
  onDismissMemory?: () => void; // 🔥 Phase 10: 기억 질문 닫기
  onDismissAutoSuggestion?: () => void; // 🔥 Phase 13: 자동 제안 닫기
  onOpenMemoryControl?: () => void; // 🔥 Phase 14: 기억 제어 패널 열기
  onShowOther?: () => void; // 🔥 Phase 22: 다른 곳 보여주기
  nearestPlace?: { id: string; distance: number } | null; // 🔥 Phase 22: 가장 가까운 장소 정보 (거리 계산용)
  showStartFeedback?: boolean; // 🔥 Phase 23: 시작 피드백 메시지 표시 여부
  showDirectionHint?: boolean; // 🔥 Phase 23: 방향 힌트 표시 여부
  sttStatus?: STTStatus; // 🔥 Phase 20: STT 상태
  navIntent?: 'idle' | 'intent-detected'; // 🔥 Phase 22: 네비게이션 의도 상태
  showConfirmStart?: boolean; // 🔥 Phase 24: 네비게이션 시작 확인 카드 표시 여부
  onStartNavigation?: () => void; // 🔥 Phase 25: 네비게이션 시작 핸들러
  onWaitNavigation?: () => void; // 🔥 Phase 24: 대기 핸들러
  onStopNavigation?: () => void; // 🔥 Phase 25: 네비게이션 중지 핸들러
  isNearDestination?: boolean; // 🔥 Phase 26: 목적지 근처 도착 여부
  memoryJustSaved?: boolean; // 🔥 Phase 27: 기억 저장 직후 상태
  onMemoryExplainTimeout?: () => void; // 🔥 Phase 27: 기억 설명 토스트 종료 핸들러
  showRouteDeviation?: boolean; // 🔥 Phase 30: 경로 이탈 배너 표시 여부
  onRouteDeviationTimeout?: () => void; // 🔥 Phase 30: 경로 이탈 배너 종료 핸들러
  onStartListening?: () => void; // 🔥 STT 시작 핸들러 (ListeningIndicator 클릭용)
  showSpeechAck?: boolean; // 🔥 Phase 29: STT 결과 즉각 반응 카드 표시 여부
  speechAckQuery?: string; // 🔥 Phase 29: 반응 카드에 표시할 검색어
  // 🔥 Phase 30: 새로운 검색 상태
  searchStatus?: import('@/types/search').SearchStatus;
  queryText?: string | null;
  phase30Places?: import('@/types/search').PlaceLite[]; // 🔥 Phase 30: 검색 결과 (PlaceLite[]) - 기존 places와 이름 충돌 방지
  onSelectPlacePhase30?: (place: import('@/types/search').PlaceLite) => void; // 🔥 Phase 30: 장소 선택 핸들러 - 기존 onSelectPlace와 이름 충돌 방지
  searchPhase?: "idle" | "searching" | "results"; // 🔥 Phase 30: 검색 단계
};

export default function MapUXOverlay({
  places,
  recommended,
  navigationStarted,
  showMemoryPrompt = false,
  showAutoSuggestion = false,
  recommendationReason = '',
  searchQuery = '', // 🔥 Phase 16: 검색어 추가
  onSelectPlace,
  onNavigate,
  onReset,
  onSaveMemory,
  onDismissMemory,
  onDismissAutoSuggestion,
  onOpenMemoryControl,
  onShowOther, // 🔥 Phase 22: 다른 곳 보여주기
  nearestPlace, // 🔥 Phase 22: 가장 가까운 장소 정보
  showStartFeedback = false, // 🔥 Phase 23: 시작 피드백 메시지 표시 여부
  showDirectionHint = false, // 🔥 Phase 23: 방향 힌트 표시 여부
  sttStatus = 'idle', // 🔥 Phase 20: STT 상태 (기본값: idle)
  navIntent = 'idle', // 🔥 Phase 22: 네비게이션 의도 상태 (기본값: idle)
  showConfirmStart = false, // 🔥 Phase 24: 네비게이션 시작 확인 카드 표시 여부
  onStartNavigation, // 🔥 Phase 25: 네비게이션 시작 핸들러
  onWaitNavigation, // 🔥 Phase 24: 대기 핸들러
  onStopNavigation, // 🔥 Phase 25: 네비게이션 중지 핸들러
  isNearDestination = false, // 🔥 Phase 26: 목적지 근처 도착 여부
  memoryJustSaved = false, // 🔥 Phase 27: 기억 저장 직후 상태
  onMemoryExplainTimeout, // 🔥 Phase 27: 기억 설명 토스트 종료 핸들러
  recognizedText = null, // 🔥 Phase 22: 인식된 문장
  showRouteDeviation = false, // 🔥 Phase 30: 경로 이탈 배너 표시 여부
  onRouteDeviationTimeout, // 🔥 Phase 30: 경로 이탈 배너 종료 핸들러
  onStartListening, // 🔥 STT 시작 핸들러 (ListeningIndicator 클릭용)
  showSpeechAck = false, // 🔥 Phase 29: STT 결과 즉각 반응 카드 표시 여부
  speechAckQuery = '', // 🔥 Phase 29: 반응 카드에 표시할 검색어
  // 🔥 Phase 30: 새로운 검색 상태
  searchStatus = "idle",
  queryText = null,
  phase30Places = [], // 🔥 Phase 30: 검색 결과 (PlaceLite[]) - 기존 places와 이름 충돌 방지
  onSelectPlacePhase30, // 🔥 Phase 30: 장소 선택 핸들러 - 기존 onSelectPlace와 이름 충돌 방지
  searchPhase = "idle", // 🔥 Phase 30: 검색 단계 (idle | searching | results)
  routeInfo = null, // 🔥 Phase 33: 경로 정보 (거리, 시간)
}: MapUXOverlayProps) {
  // 🔥 디버깅: 렌더링 확인
  console.log('[MapUXOverlay] 렌더링:', {
    placesCount: places.length,
    recommended: recommended?.name || null,
    navigationStarted,
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-50 map-ux-overlay-root">
      {/* 🔥 리모델링: MapTitle 제거 (StatusPill로 통합 완료) */}
      {/* <MapTitle sttStatus={sttStatus} /> */}
      
      {/* 🔥 리모델링: ListeningIndicator 제거 (StatusPill로 통합 완료) */}
      {/* <ListeningIndicator status={sttStatus} onStartListening={onStartListening} /> */}
      
      {/* 🔥 Phase 22: 인식된 문장 캡션 */}
      <RecognizedCaption text={recognizedText} />
      
      {/* 🔥 Phase 29: STT 결과 즉각 반응 카드 (화면 하단, 1.2초 후 검색 트리거) */}
      <STTResponseBanner 
        isVisible={showSpeechAck} 
        searchQuery={speechAckQuery}
      />
      
      {/* 🔥 Phase 30: ACK/SEARCHING/ERROR 카드 */}
      {searchStatus === "ack" && queryText && (
        <div className="speech-ack-card">
          {isMobileLikeDevice() 
            ? `알겠어요. 현재 위치 기준으로 근처 ${queryText}을(를) 찾아볼게요.`
            : `알겠어요. 지금 보고 있는 지도 근처에서 ${queryText}을(를) 찾아볼게요.`
          }
        </div>
      )}
      {/* 🔥 Phase 30: "찾는 중..." 카드 - searchPhase가 "searching"일 때만 표시, 결과가 나오면 자연스럽게 사라짐 */}
      {(searchPhase === "searching" || (searchStatus === "searching" && phase30Places.length === 0)) && searchStatus !== 'selected' && (
        <div className="speech-ack-card">
          근처 {queryText || "장소"}을(를) 찾고 있어요…
        </div>
      )}
      {searchStatus === "error" && (
        <div className="speech-ack-card">
          {queryText && (queryText.includes("축구") || queryText.includes("풋살") || queryText.includes("운동장"))
            ? "근처에 등록된 축구장이 없어요. 반경을 넓혀볼까요?"
            : "근처에서 찾지 못했어요. 다른 표현으로 말해볼까요?"
          }
        </div>
      )}
      
      {/* 🔥 Phase 24: 검색 중 배너 - 천재 모드: STT 오브젝트 근처로 이동, 추천 카드 표시 시 사라짐 */}
      <SearchingBanner 
        isVisible={sttStatus === 'searching' && searchStatus !== 'selected'} // 🔥 목적지 확정 시 사라짐
        searchQuery={searchQuery}
        hasRecommendation={searchStatus === "results" && phase30Places.length > 0} // 🔥 추천 카드 표시 시 사라짐
      />
      
      {/* 🔥 Phase 30: 결과 카드 3개 (하단) - 상태 분기 개선 */}
      {searchStatus === "results" && (
        phase30Places.length > 0 ? (
          // ✅ 결과 있음: 리스트 표시
          <div 
            className="results-sheet"
            style={{
              // 🔥 강제 스타일: 텍스트 보이게 보장
              pointerEvents: 'auto',
              color: '#1a1a1a',
              opacity: 1,
              visibility: 'visible',
            }}
          >
            <div 
              className="text-sm font-semibold mb-2 px-2 text-gray-700"
              style={{
                color: '#374151',
                opacity: 1,
                visibility: 'visible',
              }}
            >
              근처 {queryText || "장소"} {phase30Places.length}곳
            </div>
            {(phase30Places || []).map((p) => {
              // 🔥 [UI 방어] 렌더링 시점의 '안전핀' 설치
              // 데이터가 완벽하지 않으면 아예 그리지 않음
              // 🔥 좌표 접근 통일: 두 가지 구조를 모두 지원
              const placeLat = p?.location?.lat || p?.lat;
              const placeLng = p?.location?.lng || p?.lng;
              
              if (!p || (!placeLat && !placeLng)) {
                console.warn('[MapUXOverlay] 유효하지 않은 place 객체 스킵:', {
                  placeId: p?.placeId,
                  name: p?.name,
                  hasPlace: !!p,
                  hasLat: !!p?.lat,
                  hasLocation: !!p?.location,
                  hasLocationLat: !!p?.location?.lat,
                });
                return null;
              }
              
              // 🔥 UI 렌더링 방어: 좌표 데이터가 완벽할 때만 화면에 그리기
              if (!placeLat || !placeLng || typeof placeLat !== 'number' || typeof placeLng !== 'number') {
                console.warn('[MapUXOverlay] 유효하지 않은 좌표 데이터 스킵:', {
                  placeId: p?.placeId,
                  name: p?.name,
                  lat: placeLat,
                  lng: placeLng,
                  latType: typeof placeLat,
                  lngType: typeof placeLng,
                });
                return null;
              }
              
              // 🔥 디버깅: place 데이터 확인
              console.log('[MapUXOverlay] 결과 카드 렌더링', {
                placeId: p.placeId,
                name: p.name,
                distanceM: p.distanceM,
                address: p.address,
              });
              
              return (
                <button
                  key={p.placeId}
                  className="result-card"
                  onClick={() => onSelectPlacePhase30?.(p)}
                  type="button"
                  style={{
                    // 🔥 강제 스타일: 텍스트 보이게 보장
                    color: '#1a1a1a',
                    opacity: 1,
                    visibility: 'visible',
                    minHeight: '56px', // 🔥 최소 높이 확보 (터치 영역 명확화)
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                  }}
                >
                  <div 
                    className="name"
                    style={{
                      // 🔥 강제 스타일: 장소 이름 텍스트 보이게 보장
                      color: '#1a1a1a',
                      fontSize: '15px',
                      fontWeight: '700',
                      marginBottom: '4px',
                      opacity: 1,
                      visibility: 'visible',
                      lineHeight: '1.4',
                      width: '100%', // 🔥 전체 너비 사용
                    }}
                  >
                    {p?.name || '장소 이름 없음'}
                  </div>
                  <div 
                    className="meta"
                    style={{
                      // 🔥 강제 스타일: 메타 정보 텍스트 보이게 보장
                      color: '#666666',
                      fontSize: '12px',
                      opacity: 0.75,
                      visibility: 'visible',
                      lineHeight: '1.4',
                      width: '100%', // 🔥 전체 너비 사용
                    }}
                  >
                    {p.distanceM ? `${p.distanceM}m` : ''}
                    {p.distanceM && p.address ? ' · ' : ''}
                    {p.address || ''}
                  </div>
                </button>
              );
            }).filter(Boolean)}
          </div>
        ) : queryText ? (
          // ❌ 결과 없음: EmptyState 표시
          <div className="results-sheet" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>
              검색 결과가 없어요
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              "{queryText}"에 대한 결과를 찾지 못했어요
            </div>
          </div>
        ) : null
      )}
      
      {/* 🔥 검색 중: 로딩 상태 표시 */}
      {searchStatus === "searching" && queryText && (
        <div className="results-sheet" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#666' }}>
            🔍 "{queryText}" 검색 중...
          </div>
        </div>
      )}
      
      {/* 🔥 Phase 24: 결과 없음 메시지 */}
      {places.length === 0 && sttStatus === 'idle' && searchQuery && (
        <EmptyResultMessage isVisible={true} />
      )}
      
      {/* 🔥 Phase 21: Idle 상태 파동 애니메이션 */}
      {sttStatus === 'idle' && <ListeningPulse />}
      
      {/* 🔥 Phase 21: 추천 선언 배너 (말이 끝난 순간 표시) */}
      <RecommendationBanner place={recommended} />
      
      {/* 🔥 Phase 26: 네비게이션 의도 피드백 배너 (추천 장소가 있을 때만) */}
      <NavIntentBanner 
        isVisible={navIntent === 'intent-detected' && recommended !== null} 
        onTimeout={() => {
          // 상태는 MapPageContainer에서 관리하므로 여기서는 빈 함수
        }}
      />
      
      {/* 🔥 Phase 23: 방향 힌트 메시지 */}
      <DirectionHintMessage isVisible={showDirectionHint} />
      
      {/* 🔥 Phase 28: 네비게이션 시작 확인 카드는 MapController에서 직접 렌더링 (클릭 보장) */}

      {/* 🔥 Phase 25: 네비게이션 최초 1회 안내 배너 */}
      <NavigationOnceBanner isVisible={navigationStarted} />

      {/* 🔥 Phase 31: 도착 배너 (감정 설계 - 긍정적 마무리) */}
      <ArrivalBanner isVisible={isNearDestination && navigationStarted} />

      {/* 🔥 Phase 30: 경로 이탈 배너 (자연스러운 피드백) */}
      <RouteDeviationBanner 
        isVisible={showRouteDeviation && navigationStarted}
        onTimeout={onRouteDeviationTimeout}
      />

      {/* 🔥 Phase 25: 네비게이션 중지 버튼 */}
      {navigationStarted && onStopNavigation && (
        <button 
          onClick={onStopNavigation}
          className="stop-nav-button"
        >
          안내 그만할게요
        </button>
      )}

      {/* 🔥 Phase 26: 기억 질문 카드 */}
      {showMemoryPrompt && recommended && onSaveMemory && onDismissMemory && (
        <MemoryPrompt
          place={recommended}
          onAccept={onSaveMemory}
          onReject={onDismissMemory}
        />
      )}

      {/* 🔥 Phase 27: 기억 설명 토스트 */}
      {onMemoryExplainTimeout && (
        <MemoryExplainToast 
          isVisible={memoryJustSaved}
          onTimeout={onMemoryExplainTimeout}
        />
      )}

      {/* 🔥 Phase 16: 검색 결과 없음 상태 (조건부 표시 - 검색 시도 후에만, A/B 테스트) */}
      {!navigationStarted && places.length === 0 && searchQuery && searchQuery.trim() && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-md pointer-events-auto animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg px-4 py-3 text-sm text-center">
            {/* 🔥 Phase 16: A/B 테스트 - 옵션 A (조용) */}
            <p className="text-gray-700">
              이 근처에서는 찾기 어려워요.
            </p>
            {/* 🔥 Phase 21: 실패 후 재유도 힌트 */}
            <p className="text-xs text-gray-500 mt-2">
              예: '시청 근처 축구장'처럼 말해보세요.
            </p>
            {/* 🔥 Phase 16: 옵션 B (가이드) - 주석 처리, 필요시 활성화
            <p className="text-gray-700">
              근처에서 찾지 못했어요.
            </p>
            <p className="text-gray-600 mt-1">
              조금 넓게 찾아볼까요?
            </p>
            */}
          </div>
        </div>
      )}

      {/* 🔥 검색 결과 + 추천 패널 (길 안내 시작 전) */}
      {!navigationStarted && places.length > 0 && (
        <MapResultPanel
          recommended={recommended}
          recommendationReason={recommendationReason} // 🔥 Phase 11: 추천 이유 전달
          searchQuery={searchQuery || ''} // 🔥 Phase 17: 검색어 전달 (서비스 확장용)
          distance={recommended && nearestPlace && nearestPlace.id === recommended.id ? nearestPlace.distance : undefined} // 🔥 Phase 22: 거리 정보 전달
          placesCount={places.length} // 🔥 Phase 22: 전체 장소 개수 전달
          onSelect={onSelectPlace}
          onShowOther={onShowOther} // 🔥 Phase 22: 다른 곳 보여주기
          onOpenMemoryControl={onOpenMemoryControl} // 🔥 Phase 14: 기억 제어 패널 열기
        />
      )}

      {/* 🔥 실행 버튼 패널 (추천 장소 있을 때) */}
      {recommended && !navigationStarted && (
        <MapActionPanel onNavigate={onNavigate} />
      )}

      {/* 🔥 Phase 33: 길 안내 중 상태 패널 (경로 정보 포함) */}
      {navigationStarted && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-md pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* 🔥 Phase 33: 경로 정보 표시 */}
            {routeInfo && (
              <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">🚶</span>
                  <div className="text-center">
                    <p className="text-gray-900 text-sm font-medium">
                      도보 · {routeInfo.duration}
                    </p>
                    {recommended && (
                      <p className="text-gray-600 text-xs mt-1">
                        📍 {recommended.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {!routeInfo && (
              <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
                <p className="text-center text-gray-900 text-sm font-medium">
                  길 안내 중
                </p>
              </div>
            )}
            <div className="p-3">
              <button
                onClick={onReset}
                className="w-full rounded-lg bg-gray-200 text-gray-800 py-2.5 px-4 text-sm font-medium shadow-sm hover:bg-gray-300 transition-colors active:scale-[0.98]"
              >
                안내 그만할게요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 Phase 13: 자동 제안 패널 (검색 전, 기억 있을 때) */}
      {showAutoSuggestion && recommended && !navigationStarted && !searchQuery && (
        <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-xl pointer-events-auto z-[60]">
          <div className="text-sm text-gray-600 mb-2">
            전에 자주 가셨던 장소가 근처에 있어요
          </div>
          <div className="font-medium text-gray-900 mb-3">
            {recommended.name || '장소'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onNavigate}
              className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors active:scale-[0.98]"
            >
              바로 갈게요
            </button>
            <button
              onClick={onDismissAutoSuggestion}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors active:scale-[0.98]"
            >
              나중에
            </button>
          </div>
        </div>
      )}

      {/* 🔥 Phase 10: 기억 질문 패널 */}
      {showMemoryPrompt && (
        <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-xl pointer-events-auto z-[60]">
          <div className="text-sm text-gray-700 mb-3">
            다음에도 이 장소를 추천해드릴까요?
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSaveMemory}
              className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors active:scale-[0.98]"
            >
              네
            </button>
            <button
              onClick={onDismissMemory}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors active:scale-[0.98]"
            >
              아니요
            </button>
          </div>
        </div>
      )}

      {/* 🔥 리모델링: DebugOverlay 완전 제거 (운영 화면에서 렌더 0회) */}
      {/* {process.env.NODE_ENV === 'development' && <DebugOverlay ... />} */}
    </div>
  );
}
