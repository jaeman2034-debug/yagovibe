/**
 * ✅ MVP: 검색 결과 카드 컴포넌트 (UX 압축)
 * 최소 정보만 표시, 터치 영역 크게
 * 
 * 🔥 핵심: UI 프레임은 항상 유지, 내용만 바뀜
 * ❌ return null 금지
 * ✅ 빈 상태 UI 표시
 * 🔥 phase는 내용만 바꾸는 데 사용, 컴포넌트 존재/부재는 navUIState가 결정
 */

import React from 'react';
import type { PlaceLite } from '@/types/search';

type Props = {
  places: PlaceLite[];
  onSelect: (place: PlaceLite) => void;
  queryText?: string | null;
  isLoading?: boolean; // 🔥 로딩 상태
  onCalculateRoute?: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => Promise<google.maps.DirectionsResult | null>; // 🔥 경로 탐색: calculateRoute 함수
  userLocation?: { lat: number; lng: number } | null; // 🔥 사용자 현재 위치
  onRouteCalculated?: (result: google.maps.DirectionsResult) => void; // 🔥 2단계: 실시간 정보 플로팅 카드용 경로 결과 콜백
  // ❌ phase prop 제거 - navUIState가 컴포넌트 존재/부재를 결정하므로 phase는 불필요
};

export default function PlaceResultCard({ places, onSelect, queryText, isLoading = false, onCalculateRoute, userLocation, onRouteCalculated }: Props) {
  // 🔥 핵심: UI 프레임은 항상 유지, 내용만 바뀜
  // ❌ return null 금지
  // ✅ 빈 상태 UI 표시
  // 🔥 phase는 절대 사용하지 않음 - navUIState가 컴포넌트 존재/부재를 결정

  // 🔥 디버그: places 배열 상태 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('[PlaceResultCard] 렌더링:', {
      placesCount: places?.length || 0,
      places: places?.map(p => ({ placeId: p.placeId, name: p.name })) || [],
      queryText,
      isLoading,
    });
  }

  // 🔥 핵심: navUIState === 'SEARCH'일 때만 이 컴포넌트가 렌더링됨
  // 따라서 phase가 무엇이든 항상 검색 결과를 표시해야 함
  const renderContent = () => {
    // 🔥 검증: places 배열 상태 확인
    const hasPlaces = places && Array.isArray(places) && places.length > 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[PlaceResultCard] renderContent:', {
        isLoading,
        hasQueryText: !!queryText,
        hasPlaces,
        placesLength: places?.length || 0,
        placesArray: places,
      });
    }

    // 로딩 중
    if (isLoading) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          검색 중...
        </div>
      );
    }

    // 검색어 없음 (IDLE 상태)
    if (!queryText && !hasPlaces) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          검색어를 입력하세요
        </div>
      );
    }

    // 검색 결과 없음
    if (!hasPlaces) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          {queryText ? `"${queryText}" 검색 결과가 없어요` : '검색 결과가 없어요'}
        </div>
      );
    }

    // 🔥 핵심: 결과가 있으면 phase와 무관하게 항상 표시
    // ❌ phase 조건 절대 사용 금지
    // ❌ navigationStarted, uiState 등 모든 상태 조건 금지
    // 결과 있음: 리스트 표시 (무조건 렌더)
    if (process.env.NODE_ENV === 'development') {
      console.log('[PlaceResultCard] 결과 리스트 렌더링 시작:', {
        placesCount: places.length,
        places: places.map(p => ({ id: p.id, name: p.name })),
      });
    }
    
    return (
      <>
        {/* 제목 */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#666',
            marginBottom: '12px',
            paddingLeft: '4px',
          }}
        >
          {queryText || '검색'} 결과 {places.length}곳
        </div>
        
        {/* 결과 리스트 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {places.map((place) => {
            // 🔥 [UI 방어] 렌더링 시점의 '안전핀' 설치
            // 데이터가 완벽하지 않으면 아예 그리지 않음
            if (!place || (!place.lat && !place.location?.lat)) {
              console.warn('[PlaceResultCard] 유효하지 않은 place 객체 스킵:', {
                placeId: place?.id,
                name: place?.name,
                hasPlace: !!place,
                hasLat: !!place?.lat,
                hasLocation: !!place?.location,
                hasLocationLat: !!place?.location?.lat,
              });
              return null;
            }
            
            // 🔥 UI 렌더링 방어: 좌표 데이터가 완벽할 때만 화면에 그리기
            const finalLat = place.lat || place.location?.lat;
            const finalLng = place.lng || place.location?.lng;
            
            if (!finalLat || !finalLng || typeof finalLat !== 'number' || typeof finalLng !== 'number') {
              console.warn('[PlaceResultCard] 유효하지 않은 좌표 데이터 스킵:', {
                placeId: place?.id,
                name: place?.name,
                lat: finalLat,
                lng: finalLng,
                latType: typeof finalLat,
                lngType: typeof finalLng,
              });
              return null;
            }
            
            // 🔥 필터 완화: 카테고리에 상관없이 검색된 모든 장소가 리스트에 보이도록 필터 로직 완화
            // 모든 장소를 선택 가능하게 표시 (필터링 제거)
            const isSelectable = true; // 🔥 필터 완화: 모든 장소를 선택 가능하게 표시
            
            // 🔥 v4: 정규화된 PlaceLite는 이미 name이 보장됨 (검사 제거)
            // 정규화 단계에서 이미 필터링되었으므로 여기서는 불필요
            
            return (
              <div
                key={place.id}
                onClick={() => {
                  if (isSelectable) {
                    onSelect(place);
                  } else {
                    console.warn('[PlaceResultCard] 선택 불가능한 장소:', {
                      name: place.name,
                      types: placeTypes,
                    });
                  }
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: isSelectable ? '#fff' : '#f5f5f5',
                  cursor: isSelectable ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  border: `1px solid ${isSelectable ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                  transition: 'all 0.2s',
                  opacity: isSelectable ? 1 : 0.6,
                }}
                onMouseEnter={(e) => {
                  if (isSelectable) {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#1a73e8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isSelectable) {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                  }
                }}
              >
                {/* 🔥 STEP 1: 장소명 - 체크 아이콘 제거, name 강제 표시 */}
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: isSelectable ? '#111' : '#999',
                  marginBottom: place.address ? '4px' : '0',
                }}>
                  {place.name || '장소명 없음'}
                </div>

                {/* 🔥 STEP 1: 주소 - 강제 표시 (빈 문자열이어도 표시) */}
                {place.address ? (
                  <div style={{ 
                    fontSize: 13, 
                    color: '#666',
                    lineHeight: '1.4',
                  }}>
                    {place.address}
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: 12, 
                    color: '#999',
                    fontStyle: 'italic',
                  }}>
                    주소 정보 없음
                  </div>
                )}

                {/* 🔥 UI 연동: 장소 리스트(PlaceResultCard)에 '길찾기' 버튼을 추가하고, 클릭 시 지도가 해당 경로를 한눈에 볼 수 있게 bounds를 조정(fitBounds)하게 해줘 */}
                {onCalculateRoute && userLocation && place?.location && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // 🔥 경로 좌표를 계산할 때도 우리가 만든 getSafeLatLng를 사용해서 undefined 에러가 나지 않게 보호
                        const finalLat = typeof place.location?.lat === 'function' 
                          ? place.location.lat() 
                          : (place.location?.lat || place.lat);
                        const finalLng = typeof place.location?.lng === 'function' 
                          ? place.location.lng() 
                          : (place.location?.lng || place.lng);
                        
                        if (!finalLat || !finalLng || !Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
                          console.warn('⚠️ [PlaceResultCard] 길찾기: 유효하지 않은 좌표');
                          return;
                        }

                        const result = await onCalculateRoute(
                          userLocation,
                          { lat: finalLat, lng: finalLng }
                        );

                        if (result) {
                          // 🔥 경로 표시 실행: MapController에서 경로 계산이 성공하면, 그 결과(response)를 directionsRenderer.setDirections(response)에 전달
                          const mapController = (window as any).__MAP_CONTROLLER__;
                          if (mapController?.setDirectionsResult) {
                            mapController.setDirectionsResult(result);
                            console.log('✅ [PlaceResultCard] 길찾기: directionsResult 설정 완료');
                          }
                          
                          // 🔥 3단계: 1인칭 시점 및 애니메이션 - 길찾기를 시작하면 지도의 시점을 최적화해줘
                          const mapInstance = (window as any).__MAP_INSTANCE__;
                          if (mapInstance && result.routes?.[0]?.bounds) {
                            // 🔥 3단계: 출발지에서 목적지까지 전체 경로가 다 보인 후, 3초 뒤에 내 위치를 중심으로 1인칭 시점으로 자동 줌인해줘
                            // 먼저 전체 경로를 보여줌
                            mapInstance.fitBounds(result.routes[0].bounds);
                            console.log('✅ [PlaceResultCard] 길찾기: 지도 bounds 조정 완료');
                            
                            // 🔥 3단계: tilt: 45(입체감)와 heading(진행 방향)을 목적지에 맞춰서 부드럽게 애니메이션(panTo, setZoom) 처리해줘
                            setTimeout(() => {
                              if (mapInstance && userLocation) {
                                // 🔥 3단계: 첫 번째 leg의 첫 번째 step에서 heading 추출
                                const firstStep = result.routes?.[0]?.legs?.[0]?.steps?.[0];
                                const heading = firstStep?.path?.[0] && firstStep.path[1] 
                                  ? window.google?.maps?.geometry?.spherical?.computeHeading(
                                      new window.google.maps.LatLng(firstStep.path[0].lat, firstStep.path[0].lng),
                                      new window.google.maps.LatLng(firstStep.path[1].lat, firstStep.path[1].lng)
                                    ) || 0
                                  : 0;
                                
                                // 🔥 3단계: 내 위치를 중심으로 1인칭 시점으로 자동 줌인
                                mapInstance.panTo({ lat: userLocation.lat, lng: userLocation.lng });
                                mapInstance.setZoom(17); // 🔥 3단계: 줌인
                                
                                // 🔥 3단계: tilt와 heading 설정 (Google Maps API가 지원하는 경우)
                                if (mapInstance.setTilt) {
                                  mapInstance.setTilt(45); // 🔥 3단계: tilt: 45(입체감)
                                }
                                if (mapInstance.setHeading) {
                                  mapInstance.setHeading(heading); // 🔥 3단계: heading(진행 방향)을 목적지에 맞춰서
                                }
                                
                                console.log('✅ [PlaceResultCard] 3단계: 1인칭 시점으로 전환 완료', { heading, tilt: 45 });
                              }
                            }, 3000); // 🔥 3단계: 3초 뒤에 내 위치를 중심으로 1인칭 시점으로 자동 줌인
                          }
                          
                          // 🔥 2단계: 실시간 정보 플로팅 카드용 경로 결과 저장
                          if (onRouteCalculated) {
                            onRouteCalculated(result);
                          }
                        }
                      } catch (error) {
                        console.error('❌ [PlaceResultCard] 길찾기 오류:', error);
                      }
                    }}
                    style={{
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
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a73e8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#4285F4';
                    }}
                  >
                    길찾기
                  </button>
                )}
              </div>
            );
          }).filter(Boolean)}
        </div>
      </>
    );
  };

  // 🔥 레이아웃 정리: Footer - 검색 결과가 없을 때와 있을 때의 높이를 다르게 설정해
  const hasPlaces = places && Array.isArray(places) && places.length > 0;
  const hasQuery = !!queryText;
  const isEmpty = !hasPlaces && hasQuery && !isLoading;
  
  // 🔥 레이아웃 정리: Footer - 검색 결과가 없을 때와 있을 때의 높이를 다르게 설정해
  const cardHeight = isEmpty 
    ? 'auto' // 🔥 레이아웃 정리: 검색 결과 없을 때는 자동 높이
    : hasPlaces 
      ? 'calc(50vh - 80px)' // 🔥 레이아웃 정리: 검색 결과 있을 때는 50vh
      : 'auto';

  return (
    <div
      style={{
        position: 'fixed', // 🔥 레이아웃 정리: Footer - 장소 결과(PlaceResultCard)는 화면 하단에 Fixed로 고정하고
        bottom: '0', // 🔥 레이아웃 정리: Footer - 화면 하단에 고정
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '500px',
        zIndex: 10, // 🔥 레이아웃 정리: Z-Index - 검색창과 카드는 상단(z: 10)에 오도록 레이어를 정리해줘
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px 16px 0 0', // 🔥 레이아웃 정리: Footer - 상단만 둥근 모서리
        padding: '16px',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.15)', // 🔥 레이아웃 정리: Footer - 위쪽 그림자
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderBottom: 'none', // 🔥 레이아웃 정리: Footer - 하단 테두리 제거
        height: cardHeight, // 🔥 레이아웃 정리: Footer - 검색 결과가 없을 때와 있을 때의 높이를 다르게 설정해
        maxHeight: 'calc(60vh - 80px)', // 🔥 레이아웃 정리: Footer - 최대 높이 제한
        overflowY: 'auto',
      }}
    >
      {renderContent()}
    </div>
  );
}
