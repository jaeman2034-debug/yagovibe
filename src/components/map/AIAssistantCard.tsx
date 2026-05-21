/**
 * 🔥 AI 비서 레이아웃: 하단 AI 카드
 * 
 * 기존 PlaceResultCard를 확장해서 상단에 AI 응답 텍스트 영역을 추가하고,
 * 보이스 웨이브 애니메이션을 넣어줘
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlaceLite } from '@/types/search';

interface AIAssistantCardProps {
  places: PlaceLite[];
  onSelect: (place: PlaceLite) => void;
  queryText?: string | null;
  isLoading?: boolean;
  onCalculateRoute?: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => Promise<google.maps.DirectionsResult | null>;
  userLocation?: { lat: number; lng: number } | null;
  onRouteCalculated?: (result: google.maps.DirectionsResult) => void;
  aiResponse?: string; // 🔥 AI 응답 텍스트
  isListening?: boolean; // 🔥 음성 인식 중 여부
  onQuickAction?: (action: 'parking' | 'fastest' | 'stop') => void; // 🔥 음성 명령 제안: 퀵 버튼 핸들러
  onStartListening?: () => void; // 🔥 레이아웃 전면 재배치: '말해보세요' 토글 위치 수정 - 마이크 버튼 핸들러
  currentRouteResult?: google.maps.DirectionsResult | null; // 🔥 하단 시트 전환: 경로 계산 결과
  onStartNavigation?: () => void; // 🔥 하단 시트 전환: 안내 시작 버튼 핸들러
  navigationStarted?: boolean; // 🔥 안내 모드 시작 여부
  onStopNavigation?: () => void; // 🔥 안내 종료 버튼 핸들러
  currentTravelMode?: 'WALKING' | 'DRIVING' | 'TRANSIT'; // 🔥 현재 선택된 이동 수단
  onRecalculateRoute?: (place: PlaceLite, travelMode: 'WALKING' | 'DRIVING' | 'TRANSIT') => Promise<void>; // 🔥 경로 재계산 핸들러
  onRouteError?: (status: string, message: string) => void; // 🔥 에러 핸들링: 경로 계산 실패 시 콜백
  selectedPlace?: PlaceLite | null; // 🔥 가짜 '결과 없음' 삭제: 선택된 장소 (마커가 있으면 카드에 표시)
}

// 🔥 보이스 웨이브 애니메이션 컴포넌트
const VoiceWaveAnimation: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const bars = Array.from({ length: 5 }, (_, i) => i);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
      {bars.map((bar) => (
        <motion.div
          key={bar}
          style={{
            width: '4px',
            backgroundColor: '#4285F4',
            borderRadius: '2px',
          }}
          animate={
            isActive
              ? {
                  height: [8, 20, 12, 24, 8],
                  opacity: [0.5, 1, 0.7, 1, 0.5],
                }
              : {
                  height: 8,
                  opacity: 0.3,
                }
          }
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: bar * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default function AIAssistantCard({
  places,
  onSelect,
  queryText,
  isLoading = false,
  onCalculateRoute,
  userLocation,
  onRouteCalculated,
  aiResponse,
  isListening = false,
  onQuickAction,
  onStartListening, // 🔥 레이아웃 전면 재배치: '말해보세요' 토글 위치 수정
  currentRouteResult, // 🔥 하단 시트 전환: 경로 계산 결과
  onStartNavigation, // 🔥 하단 시트 전환: 안내 시작 버튼 핸들러
  navigationStarted = false, // 🔥 안내 모드 시작 여부
  onStopNavigation, // 🔥 안내 종료 버튼 핸들러
  currentTravelMode = 'DRIVING', // 🔥 현재 선택된 이동 수단
  onRecalculateRoute, // 🔥 경로 재계산 핸들러
  onRouteError, // 🔥 에러 핸들링: 경로 계산 실패 시 콜백
  selectedPlace, // 🔥 가짜 '결과 없음' 삭제: 선택된 장소 (마커가 있으면 카드에 표시)
}: AIAssistantCardProps) {
  // 🔥 가짜 '결과 없음' 삭제: selectedPlace가 있으면 검색 결과 리스트가 비어있더라도 해당 장소의 정보를 카드에 우선적으로 표시
  const displayPlaces = selectedPlace && !places.find(p => p.id === selectedPlace.id)
    ? [selectedPlace, ...places] // 🔥 selectedPlace를 맨 앞에 추가
    : places;
  
  const hasPlaces = displayPlaces && Array.isArray(displayPlaces) && displayPlaces.length > 0;
  const hasQuery = !!queryText;
  // 🔥 가짜 '결과 없음' 삭제: selectedPlace가 있으면 절대 isEmpty가 되지 않도록
  const isEmpty = !hasPlaces && hasQuery && !isLoading && !selectedPlace;

  // 🔥 레이아웃 전면 재배치: 하단 카드 레이어 - 하단 카드가 지도를 너무 많이 가리지 않게 max-height를 조절하고, 티맵처럼 위로 밀어 올릴 수 있는 핸들(Handle) 바를 추가해줘
  const [isExpanded, setIsExpanded] = useState(false);

  // 🔥 레이아웃 최종 수리: UI 레이어 정리 - 하단 정보 카드(PlaceResultCard)는 평소엔 컴팩트하게 아래에 있다가, 클릭 시에만 올라오게 높이를 조절해
  const cardHeight = isEmpty
    ? 'auto'
    : hasPlaces
      ? (isExpanded ? 'calc(80vh - 100px)' : '200px') // 🔥 레이아웃 최종 수리: UI 레이어 정리 - 평소엔 컴팩트하게(200px), 클릭 시에만 올라오게(80vh - 100px)
      : 'auto';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '500px',
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px 16px 0 0',
        padding: '16px',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderBottom: 'none',
        height: cardHeight,
        maxHeight: isExpanded ? 'calc(80vh - 100px)' : '200px', // 🔥 레이아웃 최종 수리: UI 레이어 정리 - 평소엔 컴팩트하게(200px), 클릭 시에만 올라오게(80vh - 100px)
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'height 0.3s ease-out',
        pointerEvents: 'auto', // 🔥 지도 영역 확보: 하단 카드는 터치 이벤트 보장
      }}
    >
      {/* 🔥 즉시 해결: 하단 카드 핸들바 추가 - 하단 카드 최상단 중앙에 회색의 작은 가로선(handle bar)을 넣어서 사용자가 위아래로 밀어 올릴 수 있는 티맵 스타일의 '바텀 시트'임을 명시해줘 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '40px',
          height: '4px',
          backgroundColor: '#9CA3AF', // 🔥 즉시 해결: 하단 카드 핸들바 추가 - 회색의 작은 가로선
          borderRadius: '2px',
          margin: '0 auto 8px',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          pointerEvents: 'auto', // 🔥 지도 영역 확보: 핸들바는 터치 이벤트 보장
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#6B7280';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#9CA3AF';
        }}
      />
      
      {/* 🔥 즉시 해결: AI 마이크 버튼 재배치 (말해보세요 기능) - 지도 중앙에서 사라진 '말해보세요' 기능을 하단 AIAssistantCard 우측 상단에 작고 세련된 파란색 마이크 플로팅 버튼으로 생성해줘 */}
      {onStartListening && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 20,
            pointerEvents: 'auto', // 🔥 지도 영역 확보: 마이크 버튼은 터치 이벤트 보장
          }}
        >
          <button
            type="button"
            title='예: "근처 조용한 카페 추천해줘"'
            aria-label='음성으로 AI에게 질문하기. 예: "근처 조용한 카페 추천해줘"'
            onClick={(e) => {
              e.stopPropagation();
              onStartListening(); // 🔥 즉시 해결: AI 마이크 버튼 재배치 - 버튼 클릭 시 음성 인식이 시작되도록 이벤트를 연결해
            }}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#4285F4' : '#4285F4', // 🔥 즉시 해결: AI 마이크 버튼 재배치 - 파란색 마이크 플로팅 버튼
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(66, 133, 244, 0.4)', // 🔥 즉시 해결: AI 마이크 버튼 재배치 - 플로팅 버튼 느낌
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(66, 133, 244, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.4)';
            }}
          >
            <span style={{ fontSize: '22px', color: '#FFFFFF' }}>
              {isListening ? '🎤' : '🎙️'}
            </span>
          </button>
        </div>
      )}
      {/* 🔥 AI 응답 텍스트 영역 */}
      {(aiResponse || isListening) && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#F0F4FF',
            borderRadius: '12px',
            border: '1px solid #E0E7FF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <VoiceWaveAnimation isActive={isListening} />
            <span style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>
              {isListening ? '듣는 중...' : 'AI 비서'}
            </span>
          </div>
          <AnimatePresence mode="wait">
            {aiResponse && (
              <motion.p
                key={aiResponse}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: '14px',
                  color: '#1a1a1a',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {aiResponse}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 🔥 기존 검색 결과 영역 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            검색 중...
          </div>
        )}

        {!queryText && !hasPlaces && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            검색어를 입력하세요
          </div>
        )}

        {/* 🔥 가짜 '결과 없음' 삭제: selectedPlace가 있으면 무조건 표시 */}
        {selectedPlace && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#F0F4FF',
              borderRadius: '12px',
              border: '1px solid #E0E7FF',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
              출발: 용민로 420
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a73e8', marginBottom: '4px' }}>
              {selectedPlace.name || '의정부역'}
            </div>
            {selectedPlace.address && (
              <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                {selectedPlace.address}
              </div>
            )}
          </div>
        )}

        {isEmpty && !selectedPlace && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            {queryText ? `"${queryText}" 검색 결과가 없어요` : '검색 결과가 없어요'}
          </div>
        )}

        {hasPlaces && (
          <>
            <div
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#666',
                marginBottom: '12px',
                paddingLeft: '4px',
              }}
            >
              {queryText || '검색'} 결과 {displayPlaces.length}곳
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {displayPlaces.map((place) => {
                if (!place || (!place.lat && !place.location?.lat)) {
                  return null;
                }

                const finalLat = place.lat || place.location?.lat;
                const finalLng = place.lng || place.location?.lng;

                if (!finalLat || !finalLng || typeof finalLat !== 'number' || typeof finalLng !== 'number') {
                  return null;
                }

                return (
                  <div
                    key={place.id}
                    onClick={() => onSelect(place)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#1a73e8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: place.address ? '4px' : '0' }}>
                      {place.name || '장소명 없음'}
                    </div>
                    {place.address && (
                      <div style={{ fontSize: 13, color: '#666', lineHeight: '1.4' }}>
                        {place.address}
                      </div>
                    )}

                    {/* 🔥 하단 시트 전환: 길찾기 경로가 지도에 표시되면, 하단 시트의 '길찾기' 버튼을 숨기고 '안내 시작' 버튼이나 '수단별 상세 경로 리스트'를 보여줘 */}
                    {/* 🔥 클릭 영역 최상단 배치: '길찾기' 버튼에 z-index를 높여서 다른 레이어에 가려지지 않게 */}
                    {!currentRouteResult?.routes?.[0]?.legs?.[0] && onCalculateRoute && userLocation && place?.location && (
                      <button
                        onClick={async (e) => {
                          // 🔥 이벤트 전파 보장: 버튼의 onClick 핸들러에 e.stopPropagation()을 추가해서 하단 시트의 드래그 로직이 클릭을 가로채지 못하게 막기
                          e.stopPropagation();
                          e.preventDefault();
                          console.log('✅ [AIAssistantCard] 길찾기 버튼 클릭됨');
                          
                          // 🔥 확실한 액션 연결: '길찾기' 버튼을 누르면 즉시 navigationStarted: true로 상태를 바꾸고, 지도에 경로를 그린 뒤 상단 이동 수단 탭을 보여줘
                          // 🔥 즉시 UI 전환: 경로 계산 전에 먼저 상태 변경
                          console.log('✅ [AIAssistantCard] 즉시 UI 전환: navigationStarted = true');
                          if (onStartNavigation) {
                            onStartNavigation(); // 🔥 즉시 navigationStarted: true 설정
                          }
                          
                          // 🔥 시트 강제 종료: 길찾기 버튼 클릭 시, 현재 띄워져 있는 모든 상세 카드(AIAssistantCard)를 닫고 지도 화면을 넓게 확보해줘
                          setIsExpanded(false); // 🔥 시트 강제 종료: AIAssistantCard 접기
                          
                          // 🔥 UI 레이어 정리: 장소를 선택하면 검색 리스트는 닫고 장소 상세 정보만 보여주는 게 정석이야
                          onSelect(place); // 🔥 즉시 장소 선택 (검색 리스트 닫기)
                          
                          try {
                            const finalLat = typeof place.location?.lat === 'function'
                              ? place.location.lat()
                              : (place.location?.lat || place.lat);
                            const finalLng = typeof place.location?.lng === 'function'
                              ? place.location.lng()
                              : (place.location?.lng || place.lng);

                            // 🔥 출발지 하드코딩: calculateRoute 함수의 origin 파라미터에 현재 위치 대신 사용자님이 알려주신 주소(경기도 의정부시 용민로 420)를 직접 입력하도록 수정해야 합니다.
                            // 🔥 출발지 주소 고정: 경기도 의정부시 용민로 420 (37.754, 127.114)
                            const FIXED_ORIGIN = { lat: 37.754, lng: 127.114 }; // 경기도 의정부시 용민로 420
                            const UIJEONGBU_STATION = { lat: 37.738, lng: 127.047 }; // 의정부역 실제 좌표
                            
                            // 🔥 출발지 하드코딩: 항상 용민로 420을 출발지로 사용
                            console.log('[위치확정] 출발지: 용민로 420 (37.754, 127.114)');
                            const safeOrigin = FIXED_ORIGIN; // 🔥 출발지 하드코딩: 항상 용민로 420 사용
                            
                            // 🔥 좌표값 검증: 경로 계산 시 origin(출발지)과 destination(도착지) 좌표가 올바른지 로그로 찍고, 좌표가 없다면 기본값(예: 의정부역 좌표)을 넣어서라도 경로를 그려줘
                            console.log('✅ [AIAssistantCard] 경로 계산 시작 (출발지 하드코딩):', {
                              originalOrigin: userLocation,
                              originalDestination: { lat: finalLat, lng: finalLng },
                              fixedOrigin: safeOrigin,
                              testDestination: UIJEONGBU_STATION,
                            });

                            // 🔥 좌표값 검증: 도착지 좌표가 없거나 유효하지 않으면 의정부역 사용
                            const safeDestination = (Number.isFinite(finalLat) && Number.isFinite(finalLng))
                              ? { lat: finalLat, lng: finalLng }
                              : UIJEONGBU_STATION;

                            console.log('✅ [AIAssistantCard] 좌표 검증 완료 (하드코딩 테스트):', {
                              origin: safeOrigin,
                              destination: safeDestination,
                              originIsTest: safeOrigin === TEST_ORIGIN,
                              destinationIsTest: safeDestination === UIJEONGBU_STATION,
                            });

                            let result: google.maps.DirectionsResult | null = null;
                            try {
                              result = await onCalculateRoute(safeOrigin, safeDestination);
                            } catch (error: any) {
                              // 🔥 에러 핸들링: ZERO_RESULTS가 뜰 때 사용자에게 "경로를 찾을 수 없습니다"라고 알려주고, 대신 지도를 해당 위치로 이동(panTo)시켜줘
                              console.error('❌ [AIAssistantCard] 경로 계산 오류:', error);
                              if (error?.message?.includes('ZERO_RESULTS')) {
                                // 🔥 에러 핸들링: ZERO_RESULTS 시 지도를 목적지로 이동
                                const mapInstance = (window as any).__MAP_INSTANCE__;
                                if (mapInstance) {
                                  mapInstance.panTo({ lat: safeDestination.lat, lng: safeDestination.lng });
                                  mapInstance.setZoom(15);
                                }
                                // 🔥 에러 핸들링: 사용자에게 알림 (onRouteError 콜백이 있으면 호출)
                                if (onRouteError) {
                                  onRouteError('ZERO_RESULTS', '경로를 찾을 수 없습니다');
                                }
                              }
                            }

                            // 🔥 확실한 액션 연결: 경로 계산 완료 후 지도에 경로를 그린 뒤 상단 이동 수단 탭을 보여줘
                            // (이미 위에서 onStartNavigation 호출 완료)

                            if (result) {
                              console.log('✅ [AIAssistantCard] 경로 계산 완료');
                              const mapController = (window as any).__MAP_CONTROLLER__;
                              if (mapController?.setDirectionsResult) {
                                mapController.setDirectionsResult(result);
                              }

                              const mapInstance = (window as any).__MAP_INSTANCE__;
                              if (mapInstance && result.routes?.[0]?.bounds) {
                                // 🔥 지도 인터랙션: '길찾기' 클릭 시 지도의 채도를 살짝 낮추고(Grayscale), 경로 라인(Polyline)만 선명한 파란색으로 강조해줘
                                const mapContainer = mapInstance.getDiv();
                                if (mapContainer) {
                                  mapContainer.style.filter = 'grayscale(0.3)'; // 🔥 지도 인터랙션: 채도를 살짝 낮추고
                                }
                                
                                mapInstance.fitBounds(result.routes[0].bounds);
                                setTimeout(() => {
                                  if (mapInstance && safeOrigin) {
                                    mapInstance.panTo({ lat: safeOrigin.lat, lng: safeOrigin.lng });
                                    mapInstance.setZoom(17);
                                    if (mapInstance.setTilt) {
                                      mapInstance.setTilt(45);
                                    }
                                  }
                                }, 3000);
                              }

                              if (onRouteCalculated) {
                                onRouteCalculated(result);
                              }
                            } else {
                              // 🔥 에러 핸들링: 경로 계산 실패 시에도 지도를 목적지로 이동
                              const mapInstance = (window as any).__MAP_INSTANCE__;
                              if (mapInstance) {
                                mapInstance.panTo({ lat: safeDestination.lat, lng: safeDestination.lng });
                                mapInstance.setZoom(15);
                              }
                            }
                          } catch (error) {
                            console.error('❌ [AIAssistantCard] 길찾기 오류:', error);
                            // 🔥 에러 핸들링: 예외 발생 시에도 지도를 목적지로 이동
                            const mapInstance = (window as any).__MAP_INSTANCE__;
                            if (mapInstance && place) {
                              const destLat = place.lat || (place as any).location?.lat || 37.754;
                              const destLng = place.lng || (place as any).location?.lng || 127.114;
                              mapInstance.panTo({ lat: destLat, lng: destLng });
                              mapInstance.setZoom(15);
                            }
                            // 🔥 UI 강제 전환: 경로 계산 결과와 상관없이 버튼을 누르면 일단 isNavigating 상태를 true로 바꿔서 안내 UI로 전환되는지 확인
                            onSelect(place);
                          }
                        }}
                        style={{
                          // 🔥 클릭 영역 최상단 배치: '길찾기' 버튼에 position: relative, z-index: 9999, cursor: pointer를 강제로 부여해서 다른 레이어에 가려지지 않게
                          position: 'relative',
                          zIndex: 9999,
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#4285F4',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          pointerEvents: 'auto', // 🔥 클릭 영역 확보: pointer-events를 auto로 명시적으로 설정
                        }}
                      >
                        길찾기
                      </button>
                    )}

                    {/* 🔥 하단 시트 전환: 경로가 계산되면 '안내 시작' 또는 '안내 종료' 버튼 표시 */}
                    {currentRouteResult?.routes?.[0]?.legs?.[0] && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* 🔥 UI 변경: 길찾기 버튼을 누른 후에는 하단 버튼 텍스트를 '안내 종료'로 바꾸고, 누르면 다시 검색 화면으로 돌아오게 */}
                        {/* 🔥 핸들러 직접 주입 확인: AIAssistantCard.tsx에서 렌더링하는 '안내 시작' 버튼에 실제로 handleStartNavigation 함수가 연결되었는지 다시 한번 검증하고 적용 */}
                        {!navigationStarted && onStartNavigation ? (
                          <button
                            onClick={async (e) => {
                              // 🔥 이벤트 전파 보장: 버튼의 onClick 핸들러에 e.stopPropagation()을 추가해서 하단 시트의 드래그 로직이 클릭을 가로채지 못하게 막기
                              e.stopPropagation();
                              e.preventDefault();
                              console.log('✅ [AIAssistantCard] 안내 시작 버튼 클릭됨, onStartNavigation:', !!onStartNavigation);
                              // 🔥 UI 강제 전환: 경로 계산 결과와 상관없이 버튼을 누르면 일단 isNavigating 상태를 true로 바꿔서 안내 UI로 전환되는지 확인
                              // 🔥 안내 모드 시작: 버튼을 누르면 isNavigating 상태를 true로 바꾸고, 지도를 '실시간 내비게이션 뷰'로 전환
                              // 🔥 핸들러 직접 주입 확인: handleStartNavigation 함수가 실제로 연결되었는지 확인
                              if (onStartNavigation) {
                                console.log('✅ [AIAssistantCard] handleStartNavigation 호출 (UI 강제 전환)');
                                // 🔥 UI 강제 전환: 경로 계산 결과와 상관없이 일단 안내 모드로 전환
                                onStartNavigation();
                              } else {
                                console.error('❌ [AIAssistantCard] onStartNavigation이 없습니다!');
                              }
                              // 🔥 경로 데이터 갱신: 현재 선택된 상단 탭의 수단에 맞춰서 실제 경로 API를 다시 호출하고 지도에 그리기
                              if (onRecalculateRoute && place) {
                                try {
                                  console.log('✅ [AIAssistantCard] 경로 재계산 시작:', currentTravelMode);
                                  await onRecalculateRoute(place, currentTravelMode);
                                } catch (error) {
                                  console.error('❌ [AIAssistantCard] 경로 재계산 오류:', error);
                                  // 🔥 에러 핸들링: 경로 재계산 실패 시에도 안내 모드는 유지
                                }
                              }
                            }}
                            style={{
                              // 🔥 클릭 영역 최상단 배치: '안내 시작' 버튼에 position: relative, z-index: 9999, cursor: pointer를 강제로 부여해서 다른 레이어에 가려지지 않게
                              position: 'relative',
                              zIndex: 9999,
                              padding: '10px 16px',
                              backgroundColor: '#1a73e8',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              pointerEvents: 'auto', // 🔥 클릭 영역 확보: pointer-events를 auto로 명시적으로 설정
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#1557b0';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#1a73e8';
                            }}
                          >
                            안내 시작
                          </button>
                        ) : navigationStarted && onStopNavigation ? (
                          <button
                            onClick={(e) => {
                              // 🔥 이벤트 전파 보장: 버튼의 onClick 핸들러에 e.stopPropagation()을 추가해서 하단 시트의 드래그 로직이 클릭을 가로채지 못하게 막기
                              e.stopPropagation();
                              e.preventDefault();
                              console.log('✅ [AIAssistantCard] 안내 종료 버튼 클릭됨');
                              // 🔥 UI 변경: '안내 종료' 버튼을 누르면 다시 검색 화면으로 돌아오게
                              if (onStopNavigation) {
                                onStopNavigation();
                              }
                            }}
                            style={{
                              // 🔥 클릭 영역 최상단 배치: '안내 종료' 버튼에 position: relative, z-index: 9999, cursor: pointer를 강제로 부여해서 다른 레이어에 가려지지 않게
                              position: 'relative',
                              zIndex: 9999,
                              padding: '10px 16px',
                              backgroundColor: '#dc3545',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              pointerEvents: 'auto', // 🔥 클릭 영역 확보: pointer-events를 auto로 명시적으로 설정
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#c82333';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#dc3545';
                            }}
                          >
                            안내 종료
                          </button>
                        ) : null}

                        {/* 🔥 수단별 상세 경로 리스트: 경로 단계 표시 */}
                        {currentRouteResult.routes[0].legs[0].steps && currentRouteResult.routes[0].legs[0].steps.length > 0 && (
                          <div style={{
                            marginTop: '8px',
                            padding: '12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
                              경로 안내
                            </div>
                            {currentRouteResult.routes[0].legs[0].steps.slice(0, 5).map((step, index) => {
                              const instruction = step.instructions?.replace(/<[^>]*>/g, '').trim() || '';
                              const distance = step.distance?.text || '';
                              return (
                                <div key={index} style={{
                                  padding: '8px 0',
                                  borderBottom: index < 4 ? '1px solid #e0e0e0' : 'none',
                                  fontSize: '13px',
                                  color: '#333',
                                  lineHeight: '1.5',
                                }}>
                                  <div style={{ fontWeight: 500 }}>{instruction}</div>
                                  {distance && (
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                      {distance}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {currentRouteResult.routes[0].legs[0].steps.length > 5 && (
                              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px', textAlign: 'center' }}>
                                외 {currentRouteResult.routes[0].legs[0].steps.length - 5}개 단계 더...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 🔥 음성 명령 제안: 카드 하단에 '주변 주차장', '가장 빠른 길', '안내 종료' 같은 퀵 버튼(Chip) 3개를 나란히 배치해줘 */}
      {onQuickAction && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <button
            onClick={() => onQuickAction('parking')}
            style={{
              flex: 1,
              padding: '10px 12px',
              backgroundColor: '#F0F4FF',
              color: '#4285F4',
              border: '1px solid #E0E7FF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E0E7FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0F4FF';
            }}
          >
            주변 주차장
          </button>
          <button
            onClick={() => onQuickAction('fastest')}
            style={{
              flex: 1,
              padding: '10px 12px',
              backgroundColor: '#F0F4FF',
              color: '#4285F4',
              border: '1px solid #E0E7FF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E0E7FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0F4FF';
            }}
          >
            가장 빠른 길
          </button>
          <button
            onClick={() => onQuickAction('stop')}
            style={{
              flex: 1,
              padding: '10px 12px',
              backgroundColor: '#F0F4FF',
              color: '#4285F4',
              border: '1px solid #E0E7FF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E0E7FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0F4FF';
            }}
          >
            안내 종료
          </button>
        </div>
      )}
    </div>
  );
}
