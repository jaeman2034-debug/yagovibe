/**
 * 🔥 Phase 18: Web Map Renderer
 * 
 * 책임: Google Maps JavaScript API를 사용한 지도 렌더링
 * 
 * 원칙: 지도는 그리기만 한다 (판단·요청·검색 금지)
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { loadGoogleMap } from "@/lib/loadGoogleMap";
import type { MapPageV3Props } from "@/types/map";

// 🔥 최종 해결책: DEFAULT_ZOOM 정의 강화 (에러 방지)
let DEFAULT_ZOOM: number;
try {
  const constants = require("../constants");
  DEFAULT_ZOOM = constants.DEFAULT_ZOOM || 15;
} catch (error) {
  console.warn('[WebMapRenderer] constants import 실패, 기본값 사용:', error);
  DEFAULT_ZOOM = 15;
}

// 🔥 직접 상수 선언 (사용자 요청)
const DEFAULT_ZOOM_DIRECT = 15;

// 🔥 방어 코드: DEFAULT_ZOOM이 없을 경우를 대비한 fallback (강화)
const FALLBACK_ZOOM = (typeof DEFAULT_ZOOM !== 'undefined' && DEFAULT_ZOOM !== null) 
  ? DEFAULT_ZOOM 
  : (DEFAULT_ZOOM_DIRECT || 15);

export default function WebMapRenderer({
  center,
  places,
  recommendedPlaceId,
  selectedPlaceId, // 🔥 Phase 23: 선택된 장소 ID (피드백용)
  highlightedPlaceIds = [], // 🔥 천재 모드: 하이라이트할 장소 ID (상위 3개)
  previewPlace = null, // 🔥 정상 지도 페이지: 단일 마커 상태
  routePath = [],
  directionsResult = null, // 🔥 Phase 33: Directions API 결과 (DirectionsRenderer용)
  navigationStarted = false,
  showDirectionHint = false, // 🔥 Phase 24: 방향 힌트 표시 여부
  locationState = null, // 🔥 Phase 24: 현재 위치
  destination = null, // 🔥 Phase 24: 목적지
  isSearching = false, // 🔥 Phase 24: 검색 중 여부
  onMapReady,
  onMapLoad, // 🔥 Phase 30: 지도 인스턴스 전달
  onMarkerClick, // 🔥 Phase 32.1: 마커 클릭 핸들러
}: MapPageV3Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<(google.maps.Marker | google.maps.marker.AdvancedMarkerElement)[]>([]); // 🔥 Phase 32: AdvancedMarkerElement 지원
  const skeletonMarkersRef = useRef<google.maps.Marker[]>([]); // 🔥 Phase 24: 스켈레톤 마커
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null); // 🔥 Phase 29.5: 현재 위치 마커
  const previewMarkerRef = useRef<google.maps.Marker | null>(null); // 🔥 정상 지도 페이지: previewPlace 마커
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const directionHintRef = useRef<google.maps.Polyline | null>(null); // 🔥 Phase 24: 방향 힌트 선
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null); // 🔥 Phase 33: DirectionsRenderer
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null); // 🔥 경로 탐색: DirectionsService 초기화
  const routeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null); // 🔥 소요 시간 표시: 경로 정보 InfoWindow
  const [isMapReady, setIsMapReady] = useState(false);
  const isInitializingRef = useRef(false);
  const onMarkerClickRef = useRef(onMarkerClick); // 🔥 Phase 32.1: 무한 루프 방지용 ref
  const markerListenersRef = useRef<google.maps.MapsEventListener[]>([]); // 🔥 Phase 32: 마커 클릭 리스너 관리
  
  // 🔥 천재 모드: 하이라이트 ID Set 변환
  const highlightedIdsSet = useMemo(() => {
    if (Array.isArray(highlightedPlaceIds)) {
      return new Set(highlightedPlaceIds);
    }
    if (highlightedPlaceIds instanceof Set) {
      return highlightedPlaceIds;
    }
    return new Set<string>();
  }, [highlightedPlaceIds]);
  // 🔥 임시: 지도 인터랙션 리스너 (음성 트리거 우선 복구를 위해 주석 처리)
  // const onMapInteractionRef = useRef<((type: 'dragstart' | 'zoom' | 'idle') => void) | null>(null);
  // const mapInteractionListenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // 🔥 지도 초기화 (최초 1회만)
  useEffect(() => {
    const initMap = async () => {
      let retryCount = 0;
      while (!containerRef.current && retryCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
      }

      if (!containerRef.current) {
        console.error('❌ [WebMapRenderer] containerRef가 null입니다. retryCount:', retryCount);
        return;
      }

      // 🔥 containerRef 크기 확인
      const rect = containerRef.current.getBoundingClientRect();
      console.log('✅ [WebMapRenderer] containerRef 크기:', { width: rect.width, height: rect.height });

      if (rect.width === 0 || rect.height === 0) {
        console.error('❌ [WebMapRenderer] containerRef 크기가 0입니다:', rect);
        return;
      }

      if (mapRef.current || isInitializingRef.current) {
        console.log('⏸️ [WebMapRenderer] 지도 이미 초기화됨 또는 초기화 중');
        return;
      }

      isInitializingRef.current = true;
      let cancelled = false;

      console.log('✅ [WebMapRenderer] 지도 초기화 시작');

      // 🔥 통일된 importLibrary 방식 사용
      import("@/lib/loadGoogleMap").then(({ loadMapLibrary }) => {
        return loadMapLibrary();
      })
        .then(async ({ Map }) => {
          if (cancelled || !containerRef.current) {
            console.error('❌ [WebMapRenderer] 지도 초기화 취소됨');
            isInitializingRef.current = false;
            return;
          }

          console.log('✅ [WebMapRenderer] Google Maps API 로드 완료, 지도 생성 중...');
          // 🔥 하드코딩 테스트: 서울시청 주변 (37.5665, 126.9780) - 개발 모드에서만
          const DEV_ORIGIN = import.meta.env.DEV 
            ? { lat: 37.5665, lng: 126.9780 } // 서울시청 (하드코딩 테스트용)
            : { lat: 37.754, lng: 127.114 }; // 경기도 의정부시 용민로 420 (기본값)
          const map = new Map(containerRef.current, {
            center: DEV_ORIGIN, // 🔥 고정 위치 사용
            zoom: FALLBACK_ZOOM, // 🔥 초기 줌 레벨 (constants에서 가져옴, fallback 포함)
            minZoom: 10, // 🔥 최소 줌 레벨 제한
            maxZoom: 19, // 🔥 최대 줌 레벨 완화 (18 → 19): 상세 지도 확대 허용
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            // 🔥 지도 타일 로딩 최적화
            gestureHandling: 'greedy', // 🔥 터치 제스처 최적화 (사용자 확대/축소 자유롭게)
            mapTypeId: 'roadmap' as google.maps.MapTypeId, // 🔥 도로 지도 타입 명시 (importLibrary 방식)
          });

          if (cancelled) {
            isInitializingRef.current = false;
            return;
          }

          mapRef.current = map;
          setIsMapReady(true);
          console.log('✅ [WebMapRenderer] 지도 생성 완료, mapRef 설정됨');
          
          // 🔥 서비스 초기화: DirectionsService와 DirectionsRenderer 초기화
          if (window.google?.maps?.DirectionsService) {
            directionsServiceRef.current = new window.google.maps.DirectionsService();
            console.log('✅ [WebMapRenderer] DirectionsService 초기화 완료');
          }
          
          if (window.google?.maps?.DirectionsRenderer) {
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
              map: map,
              suppressMarkers: true, // 기존 마커 유지
              polylineOptions: {
                strokeColor: '#4285F4', // 🔥 경로는 파란색 굵은 라인으로 설정
                strokeWeight: 5,
                strokeOpacity: 0.8,
              },
            });
            console.log('✅ [WebMapRenderer] DirectionsRenderer 초기화 완료 (파란색 굵은 라인)');
          }
          
          // 🔥 지도 타일 로딩 완료 대기 (상세 지도 표시 보장)
          let tilesLoadedCount = 0;
          const tilesLoadedListener = map.addListener('tilesloaded', () => {
            tilesLoadedCount++;
            console.log(`✅ [WebMapRenderer] 지도 타일 로딩 완료 (${tilesLoadedCount}회)`);
            
            // 🔥 타일이 로드되었는지 실제로 확인
            const bounds = map.getBounds();
            if (bounds) {
              console.log('✅ [WebMapRenderer] 지도 bounds 확인:', {
                north: bounds.getNorthEast().lat(),
                south: bounds.getSouthWest().lat(),
                east: bounds.getNorthEast().lng(),
                west: bounds.getSouthWest().lng(),
              });
            }
            
            // 🔥 줌 레벨이 너무 높으면 자동 조정
            const currentZoom = map.getZoom() || 14;
            if (currentZoom > 17) {
              console.warn('⚠️ [WebMapRenderer] 줌 레벨이 너무 높음, 17로 조정', { currentZoom });
              map.setZoom(17);
            }
          });

          // 🔥 타일 로딩 에러 감지 (HTTP 리퍼러 제한 등) - 강화
          const errorListener = map.addListener('error', (error: any) => {
            console.error('❌ [WebMapRenderer] 지도 타일 로딩 에러:', error);
            console.error('   에러 상세:', {
              message: error?.message,
              name: error?.name,
              code: error?.code,
              status: error?.status,
              toString: String(error),
            });
            console.error('   현재 도메인:', window.location.origin);
            console.error('   현재 URL:', window.location.href);
            console.error('   API 키:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 10) + '...');
          });

          // 🔥 타일 로딩 타임아웃 감지 (5초 후 타일이 로드되지 않으면 경고) - 강화
          const tileLoadTimeout = setTimeout(() => {
            const bounds = map.getBounds();
            const container = containerRef.current;
            const containerRect = container?.getBoundingClientRect();
            
            console.error('❌ [WebMapRenderer] 지도 타일 로딩 타임아웃 (5초 경과)');
            console.error('   현재 도메인:', window.location.origin);
            console.error('   현재 URL:', window.location.href);
            console.error('   containerRef 크기:', {
              width: containerRect?.width || 0,
              height: containerRect?.height || 0,
              exists: !!container,
            });
            console.error('   mapRef 상태:', {
              exists: !!mapRef.current,
              hasBounds: !!bounds,
            });
            
            if (!bounds) {
              console.error('   ⚠️ 지도 bounds가 없습니다 - API 키 도메인 제한 가능성');
              console.error('   해결 방법: Google Cloud Console에서 API 키의 HTTP 리퍼러 제한에 다음 추가:');
              console.error('   - https://localhost:5173/*');
              console.error('   - http://localhost:5173/*');
              console.error('   - https://127.0.0.1:5173/*');
              console.error('   - http://127.0.0.1:5173/*');
            }
            
            // 🔥 containerRef 크기 확인
            if (containerRect && (containerRect.width === 0 || containerRect.height === 0)) {
              console.error('   ⚠️ containerRef 크기가 0입니다 - 지도가 숨겨져 있을 수 있음');
            }
          }, 5000);

          // 타일 로딩 완료 시 타임아웃 취소
          const tilesLoadedTimeoutListener = map.addListener('tilesloaded', () => {
            clearTimeout(tileLoadTimeout);
            console.log('✅ [WebMapRenderer] 타일 로딩 타임아웃 취소됨');
          });
          
          // 🔥 리스너 정리용 저장
          (map as any).__tilesLoadedListener = tilesLoadedListener;
          (map as any).__errorListener = errorListener;
          (map as any).__tilesLoadedTimeoutListener = tilesLoadedTimeoutListener;
          
          // 🔥 Phase 30: 지도 인스턴스 전달
          // 🔥 지도 인스턴스를 window.__MAP_INSTANCE__에 저장 (Place Details API 호출용)
          (window as any).__MAP_INSTANCE__ = map;
          console.log('✅ [WebMapRenderer] 지도 인스턴스를 window.__MAP_INSTANCE__에 저장');
          
          if (onMapLoad) {
            onMapLoad(map);
          }
          
          if (onMapReady) {
            console.log('✅ [WebMapRenderer] onMapReady 콜백 호출');
            onMapReady();
          }
          
          isInitializingRef.current = false;
          
          // 🔥 임시: 지도 인터랙션 이벤트 리스너 주석 처리 (음성 트리거 우선 복구)
          // 지도 인터랙션은 나중에 다시 활성화 예정
          /*
          // 🔥 인터랙션 단계: 지도 이벤트 리스너 추가 (타이밍 관리)
          // 지도 이동/줌 완료 시 콜백 (debounce 400ms)
          let idleTimer: NodeJS.Timeout | null = null;
          
          const dragStartListener = map.addListener('dragstart', () => {
            // 🔥 인터랙션 단계: 드래그 시작 시 즉시 moving 상태로 전환
            if (onMapInteractionRef.current) {
              onMapInteractionRef.current('dragstart');
            }
          });
          
          // 🔥 인터랙션 단계: 지도 클릭 이벤트 (위치 확정용 - 빈 공간 클릭)
          // 주의: 마커 클릭은 onMarkerClick에서 처리하므로 여기서는 로깅만
          const mapClickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
            console.log('🗺️ [WebMapRenderer] 인터랙션: 지도 클릭 (빈 공간)', {
              lat: e.latLng?.lat(),
              lng: e.latLng?.lng(),
            });
            // 빈 공간 클릭 시에는 상태를 바꾸지 않음 (마커 클릭만 selected로 전환)
          });
          
          const dragEndListener = map.addListener('dragend', () => {
            // dragend 후 idle까지 대기 (debounce)
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
              if (onMapInteractionRef.current) {
                onMapInteractionRef.current('idle');
              }
            }, 400); // 400ms debounce
          });
          
          const zoomChangedListener = map.addListener('zoom_changed', () => {
            // 줌 변경 시 즉시 콜백 (선택 해제용)
            if (onMapInteractionRef.current) {
              onMapInteractionRef.current('zoom');
            }
            // zoom_changed 후 idle까지 대기 (debounce)
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
              if (onMapInteractionRef.current) {
                onMapInteractionRef.current('idle');
              }
            }, 400); // 400ms debounce
          });
          
          const idleListener = map.addListener('idle', () => {
            // Google Maps의 idle 이벤트 (이동 완료)
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
              if (onMapInteractionRef.current) {
                onMapInteractionRef.current('idle');
              }
            }, 100); // idle은 이미 완료 상태이므로 짧은 딜레이
          });
          
          // 리스너 저장 (정리용)
          mapInteractionListenersRef.current = [
            dragStartListener,
            dragEndListener,
            zoomChangedListener,
            idleListener,
            mapClickListener,
          ];
          */
        })
        .catch((err) => {
          if (!cancelled) {
            console.error('❌ [WebMapRenderer] 지도 로드 실패:', err);
          }
          isInitializingRef.current = false;
        });

      return () => {
        cancelled = true;
        isInitializingRef.current = false;
        
        // 🔥 cleanup 시 리스너 정리 (타일 사라짐 방지)
        if (mapRef.current && window.google?.maps) {
          const map = mapRef.current as any;
          if (map.__tilesLoadedListener) {
            window.google.maps.event.removeListener(map.__tilesLoadedListener);
          }
          if (map.__errorListener) {
            window.google.maps.event.removeListener(map.__errorListener);
          }
          if (map.__tilesLoadedTimeoutListener) {
            window.google.maps.event.removeListener(map.__tilesLoadedTimeoutListener);
          }
        }
      };
    };

    initMap();

    return () => {
      isInitializingRef.current = false;
      
      // 🔥 컴포넌트 언마운트 시에도 지도 인스턴스는 유지 (타일 사라짐 방지)
      // mapRef.current는 유지하되, 리스너만 정리
      if (mapRef.current && window.google?.maps) {
        const map = mapRef.current as any;
        if (map.__tilesLoadedListener) {
          window.google.maps.event.removeListener(map.__tilesLoadedListener);
        }
        if (map.__errorListener) {
          window.google.maps.event.removeListener(map.__errorListener);
        }
        if (map.__tilesLoadedTimeoutListener) {
          window.google.maps.event.removeListener(map.__tilesLoadedTimeoutListener);
        }
      }
    };
  }, []);

  // 🔥 정상 지도 페이지: previewPlace가 바뀌면 지도 이동 + 마커 1개만 표시 (v3 FINAL)
  // ⭐⭐⭐ Single Source of Truth: previewPlace는 정규화된 PlaceLite만 받음
  // ❌ undefined 체크, fallback, 방어 코드 전부 제거
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !previewPlace) return;

    // 🔥 정규화된 PlaceLite는 이미 모든 필드가 보장됨
    // 여기서는 그냥 사용만 함 (검사 불필요)
    const pos = { lat: previewPlace.lat, lng: previewPlace.lng };
    const map = mapRef.current;

    // 🔥 v4 SEARCH ONLY: panTo + setZoom만 사용 (fitBounds 절대 금지)
    map.panTo(pos);
    map.setZoom(16); // 🔥 고정 줌 레벨

    // 🔥 기존 마커 제거 후 재생성
    if (previewMarkerRef.current) {
      previewMarkerRef.current.setMap(null);
      previewMarkerRef.current = null;
    }

    previewMarkerRef.current = new window.google.maps.Marker({
      position: pos,
      map,
      title: previewPlace.name,
      animation: window.google.maps.Animation.DROP, // 🔥 마커 드롭 애니메이션
    });

    console.log('[MAP] 마커 표시 완료:', {
      name: previewPlace.name,
      address: previewPlace.address,
      position: pos,
    });
  }, [isMapReady, previewPlace?.id]);

  // 🔥 마커 렌더링 (기존 로직 - previewPlace가 없을 때만 사용)
  useEffect(() => {
    // 🔥 정상 지도 페이지: previewPlace가 있으면 다른 마커 생성 완전 차단
    if (previewPlace) {
      // previewPlace가 있을 때는 기존 places 기반 마커를 모두 제거
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markersRef.current = [];
      return;
    }
    
    console.log("📍 [WebMapRenderer] 마커 렌더 places:", places);
    
    // 🔥 안전 패턴: Google Maps API 확인
    if (!window.google || !window.google.maps || !window.google.maps.Marker) {
      console.warn("⚠️ [WebMapRenderer] Google Maps API 준비되지 않음");
      return;
    }
    
    if (!isMapReady || !mapRef.current) {
      return;
    }

    // 🔥 마커 생성 조건 확인
    if (!places || places.length === 0) {
      console.warn("⚠️ [WebMapRenderer] 마커 생성 스킵: places 비어 있음");
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      return;
    }

    console.log(`✅ [WebMapRenderer] 마커 생성 시작: ${places.length}개 장소`);

    // 🔒 CONFIRMED 상태 보호: 목적지 마커를 먼저 렌더링하고 보호
    const hasConfirmedDestination = selectedPlaceId && places.some(p => p.id === selectedPlaceId);
    
    if (hasConfirmedDestination) {
      console.log('🔒 [WebMapRenderer] CONFIRMED 상태 감지: 목적지 마커 우선 보장');
    }

    // 🔥 중복 마커 방지: 검색할 때마다 이전 마커들이 지도에서 지워지고 새 마커들(processedPlaces)이 찍히도록
    console.log(`🗑️ [WebMapRenderer] 이전 마커 제거: ${markersRef.current.length}개`);
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    console.log(`✅ [WebMapRenderer] 이전 마커 제거 완료, 새 마커 생성 시작`);

    console.log('🔥 [WebMapRenderer] 마커 렌더링 시작:', {
      placesCount: places.length,
      selectedPlaceId,
      recommendedPlaceId,
      hasConfirmedDestination,
      places: places.map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })),
    });

    // 🔒 CONFIRMED 상태: 목적지 마커를 먼저 렌더링 (우선순위 보장)
    // places 배열에서 selectedPlaceId를 가진 장소를 먼저 처리
    const sortedPlaces = [...places].sort((a, b) => {
      const aIsSelected = selectedPlaceId === a.id;
      const bIsSelected = selectedPlaceId === b.id;
      if (aIsSelected && !bIsSelected) return -1; // 목적지가 먼저
      if (!aIsSelected && bIsSelected) return 1;
      return 0;
    });

    if (hasConfirmedDestination) {
      const destinationPlace = places.find(p => p.id === selectedPlaceId);
      if (destinationPlace) {
        console.log('🔒 [WebMapRenderer] 목적지 마커 우선 렌더링 (정렬 완료):', {
          id: destinationPlace.id,
          name: destinationPlace.name,
          lat: destinationPlace.lat,
          lng: destinationPlace.lng,
          sortedFirst: sortedPlaces[0]?.id === selectedPlaceId,
        });
      }
    }

    sortedPlaces.forEach((place) => {
      // 🔥 WebMapRenderer 보강: sortedPlaces.forEach 문 안에서 좌표를 읽을 때
      // 1. sanitizePlaces를 통해 정제된 데이터인지 확인
      // 2. 만약 정제가 안 된 원본이라면 여기서 마지막으로 함수 호출() 처리
      // 초록색 중심점 마커 말고, 검색 결과 리스트(processedPlaces)에 있는 장소들을 지도에 Marker로 뿌리기 위해
      // 반드시 getSafeLatLng 함수를 거친 숫자 좌표를 사용해야 함
      
      let finalLat: number | null = null;
      let finalLng: number | null = null;
      
      // 🔥 좌표 추출: 평면 구조 우선 (place.lat, place.lng)
      // 함수형 좌표 처리: typeof place.lat === 'function' ? place.lat() : place.lat
      try {
        finalLat = typeof place.lat === 'function' ? Number(place.lat()) : (typeof place.lat === 'number' ? place.lat : null);
        finalLng = typeof place.lng === 'function' ? Number(place.lng()) : (typeof place.lng === 'number' ? place.lng : null);
      } catch (e) {
        console.warn('[WebMapRenderer] 좌표 추출 실패 (평면 구조):', e);
      }
      
      // 🔥 2단계: 평면 구조에서 못 찾았으면 location 객체에서 추출
      if (finalLat === null || finalLng === null) {
        if (place.location) {
          const loc = place.location;
          try {
            finalLat = finalLat ?? (typeof loc.lat === 'function' ? Number(loc.lat()) : (typeof loc.lat === 'number' ? loc.lat : null));
            finalLng = finalLng ?? (typeof loc.lng === 'function' ? Number(loc.lng()) : (typeof loc.lng === 'number' ? loc.lng : null));
          } catch (e) {
            console.warn('[WebMapRenderer] 좌표 추출 실패 (location 객체):', e);
          }
        }
      }
      
      // 🔥 에러 프리 보장: 데이터가 조금이라도 이상하면 그냥 마커를 그리지 말고(return) 넘어가도록
      // Number.isFinite로 최종 검증 (의정부역 검색 시 붉은 에러 창이 절대로 뜨지 않도록)
      if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
        console.warn('⚠️ [WebMapRenderer] 마커 스킵: 좌표 유효하지 않음 (에러 프리 보장)', {
          id: place.id,
          name: place.name,
          lat: finalLat,
          lng: finalLng,
          placeLat: place.lat,
          placeLng: place.lng,
          hasLocation: !!place.location,
          locationLat: place.location?.lat,
          locationLng: place.location?.lng,
          latType: typeof finalLat,
          lngType: typeof finalLng,
          isFiniteLat: Number.isFinite(finalLat),
          isFiniteLng: Number.isFinite(finalLng),
        });
        return; // 🔥 데이터가 이상하면 마커를 그리지 않고 넘어감
      }

      // 🔥 렌더링 방어: 강력한 Try-Catch (532번 라인 주변)
      try {
        const isRecommended = recommendedPlaceId === place.id;
        const isSelected = selectedPlaceId === place.id; // 🔥 Phase 23: 선택된 장소 확인
        const isHighlighted = highlightedIdsSet.has(place.id); // 🔥 천재 모드: 상위 3개 하이라이트
        
        // 🔥 디버깅: 목적지 마커 렌더링 확인
        if (isSelected) {
          console.log('🔥 [WebMapRenderer] 목적지 마커 렌더링:', {
            placeId: place.id,
            name: place.name,
            lat: finalLat, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
            lng: finalLng, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
            selectedPlaceId,
            isValid: typeof finalLat === 'number' && typeof finalLng === 'number',
          });
        }
        
        // 🔥 Phase 32: AdvancedMarkerElement 사용 (클릭 이벤트 보장)
        const markerLib = (window.google.maps as any).marker;
        const useAdvancedMarker = markerLib && markerLib.AdvancedMarkerElement;
        
        let marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;
        let markerEl: HTMLDivElement | null = null; // 🔥 Phase 32: 스코프 문제 해결
        
        if (useAdvancedMarker) {
          // 🔥 Phase 32: AdvancedMarkerElement 사용
          const { AdvancedMarkerElement } = markerLib;
          
          // 🔥 목적지 마커 명확히 표기: 선택된 장소는 목적지로 확정
          markerEl = document.createElement('div');
          if (isSelected) {
            // 🔥 목적지 마커: 더 크고, 명확한 색상, 강한 그림자
            markerEl.style.width = '44px';
            markerEl.style.height = '44px';
            markerEl.style.borderRadius = '50%';
            markerEl.style.backgroundColor = '#10B981'; // 🔥 초록색 (목적지 = 확정)
            markerEl.style.border = `4px solid white`;
            markerEl.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.5), 0 2px 8px rgba(0,0,0,0.3)';
            markerEl.style.cursor = 'pointer';
            markerEl.style.pointerEvents = 'auto';
            markerEl.style.transition = 'all 0.3s ease';
            
            // 🔥 drop 애니메이션 1회 (목적지 확정 신호)
            markerEl.style.animation = 'markerDrop 0.5s ease-out';
            markerEl.style.transform = 'scale(1)';
            
            // 애니메이션 키프레임 추가 (한 번만 실행)
            if (!document.getElementById('marker-drop-animation')) {
              const style = document.createElement('style');
              style.id = 'marker-drop-animation';
              style.textContent = `
                @keyframes markerDrop {
                  0% {
                    transform: scale(0) translateY(-20px);
                    opacity: 0;
                  }
                  50% {
                    transform: scale(1.2) translateY(0);
                    opacity: 1;
                  }
                  100% {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                  }
                }
              `;
              document.head.appendChild(style);
            }
            
            // 🔥 천재 모드: 펄스 애니메이션 추가
            if (!document.getElementById('genius-pulse-animation')) {
              const pulseStyle = document.createElement('style');
              pulseStyle.id = 'genius-pulse-animation';
              pulseStyle.textContent = `
                @keyframes pulse {
                  0%, 100% {
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5), 0 0 0 4px rgba(139, 92, 246, 0.2);
                  }
                  50% {
                    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.7), 0 0 0 6px rgba(139, 92, 246, 0.3);
                  }
                }
              `;
              document.head.appendChild(pulseStyle);
            }
          } else {
            // 🔥 천재 모드: 하이라이트 마커 (상위 3개)
            if (isHighlighted && !isRecommended) {
              markerEl.style.width = '24px';
              markerEl.style.height = '24px';
              markerEl.style.borderRadius = '50%';
              markerEl.style.backgroundColor = '#8B5CF6'; // 보라색 (천재 모드)
              markerEl.style.border = '3px solid white';
              markerEl.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.5), 0 0 0 4px rgba(139, 92, 246, 0.2)'; // 🔥 하이라이트 효과
              markerEl.style.cursor = 'pointer';
              markerEl.style.pointerEvents = 'auto';
              markerEl.style.transition = 'transform 0.2s, box-shadow 0.3s';
              markerEl.style.animation = 'pulse 2s infinite'; // 🔥 펄스 애니메이션
            } else {
              // 추천/일반 마커
              markerEl.style.width = isRecommended ? '28px' : '16px';
              markerEl.style.height = isRecommended ? '28px' : '16px';
              markerEl.style.borderRadius = '50%';
              markerEl.style.backgroundColor = isRecommended ? '#EF4444' : '#9CA3AF';
              markerEl.style.border = `3px solid white`;
              markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
              markerEl.style.cursor = 'pointer';
              markerEl.style.pointerEvents = 'auto';
              markerEl.style.transition = 'transform 0.2s';
            }
          }
          
          // 호버 효과 (목적지 마커는 제외)
          if (!isSelected) {
            markerEl.addEventListener('mouseenter', () => {
              markerEl.style.transform = 'scale(1.2)';
            });
            markerEl.addEventListener('mouseleave', () => {
              markerEl.style.transform = 'scale(1)';
            });
          }
          
          marker = new AdvancedMarkerElement({
            map: mapRef.current!,
            position: { lat: finalLat, lng: finalLng }, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
            content: markerEl,
            title: place.name,
          });
        } else {
          // 🔥 Fallback: 기본 Marker 사용
          const markerOptions: google.maps.MarkerOptions = {
            map: mapRef.current!,
            position: { lat: finalLat, lng: finalLng }, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
            title: place.name,
          };

          if (isSelected) {
            // 🔥 1단계: 티맵 스타일 - 도착지 마커를 구글 기본 핀 대신 티맵 느낌의 커스텀 아이콘으로 교체해줘
            markerOptions.icon = {
              path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, // 🔥 티맵 스타일: 화살표 모양 마커
              scale: 8, // 🔥 티맵 스타일: 더 큰 크기
              fillColor: '#1A5FFF', // 🔥 티맵 스타일: 진한 파란색
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
              rotation: 180, // 🔥 화살표가 아래를 가리키도록 회전
            };
            markerOptions.zIndex = 2000;
            markerOptions.animation = window.google.maps.Animation.DROP; // 🔥 DROP 애니메이션 (1회)
          } else if (isHighlighted && !isRecommended) {
            // 🔥 천재 모드: 하이라이트 마커 (보라색)
            markerOptions.icon = {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#8B5CF6',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            };
            markerOptions.animation = window.google.maps.Animation.BOUNCE; // 🔥 바운스 애니메이션
            markerOptions.zIndex = 1000; // 🔥 상위 레이어
          } else if (isRecommended) {
            markerOptions.icon = {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#EF4444',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            };
            markerOptions.zIndex = 1000;
            markerOptions.animation = window.google.maps.Animation.DROP;
          } else {
            markerOptions.icon = {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#9CA3AF',
              fillOpacity: 0.6,
              strokeColor: '#FFFFFF',
              strokeWeight: 1,
            };
            markerOptions.zIndex = 100;
          }
          
          // 🔥 강화: Marker 생성 전 최종 검증
          if (!window.google?.maps?.Marker) {
            console.warn('⚠️ [WebMapRenderer] Marker 생성 직전 API 확인 실패 - 스킵');
            return; // 🔥 forEach 루프에서는 continue 대신 return 사용
          }
          
          // 🔥 렌더링 방어: 532번 라인 주변 강력한 Try-Catch (마커 생성)
          try {
            marker = new window.google.maps.Marker(markerOptions);
          } catch (markerError) {
            console.warn('⚠️ [WebMapRenderer] Marker 생성 실패 - 스킵:', markerError, {
              placeId: place.id,
              placeName: place.name,
              lat: finalLat, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
              lng: finalLng, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
              markerOptions,
            });
            return; // 🔥 마커 생성 실패 시 해당 place 스킵하고 다음으로
          }
        }
        
        // 🔥 렌더링 방어: markersRef에 추가 전 최종 검증
        if (marker) {
          try {
            // 🔥 지도 인터랙션: 도착지 마커 위에 '도착지'라는 텍스트 툴팁을 띄워 시인성을 높여줘
            if (isSelected && window.google?.maps?.InfoWindow && marker instanceof window.google.maps.Marker) {
              const infoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="
                    padding: 8px 12px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    font-size: 14px;
                    font-weight: 600;
                    color: #1A5FFF;
                    white-space: nowrap;
                  ">
                    도착지
                  </div>
                `,
              });
              
              // 🔥 지도 인터랙션: 마커 클릭 시 툴팁 표시
              marker.addListener('click', () => {
                infoWindow.open(mapRef.current, marker);
              });
            }
            
            markersRef.current.push(marker);
          } catch (pushError) {
            console.warn('⚠️ [WebMapRenderer] markersRef.push 실패:', pushError, {
              placeId: place.id,
              placeName: place.name,
            });
            // 🔥 push 실패해도 앱 중단하지 않음
          }
        }
        
        // 🔥 Phase 32.5: 마커 클릭/터치 리스너 추가 (모바일 대응 강화)
        if (onMarkerClickRef.current) {
          if (useAdvancedMarker && markerEl) {
            // AdvancedMarkerElement: DOM 이벤트 사용 (모바일 터치 이벤트 추가)
            const handleInteraction = (e: Event) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('🔴 [WebMapRenderer] Phase 32.5: AdvancedMarker 상호작용 감지:', {
                placeId: place.id,
                placeName: place.name,
                eventType: e.type,
                lat: finalLat, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
                lng: finalLng, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
              });
              onMarkerClickRef.current?.(place);
              console.log('✅ [WebMapRenderer] Phase 32.5: onMarkerClick 콜백 호출 완료');
            };
            
            // 🔥 Phase 32.5: 모바일 터치 이벤트 추가 (pointerdown, touchstart)
            markerEl.addEventListener('pointerdown', handleInteraction);
            markerEl.addEventListener('touchstart', handleInteraction);
            markerEl.addEventListener('click', handleInteraction);
            
            // 리스너 정리를 위해 저장
            (marker as any).__clickHandler = handleInteraction;
            (marker as any).__markerEl = markerEl;
            console.log('✅ [WebMapRenderer] Phase 32.5: AdvancedMarker 상호작용 리스너 등록 완료 (click, pointerdown, touchstart)');
          } else {
            // 기본 Marker: Google Maps 이벤트 사용
            const listener = (marker as google.maps.Marker).addListener('click', () => {
              console.log('🔴 [WebMapRenderer] Phase 32.5: Marker 클릭 감지:', {
                placeId: place.id,
                placeName: place.name,
                lat: finalLat, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
                lng: finalLng, // 🔥 getSafeLatLng를 거친 숫자 좌표 사용
              });
              onMarkerClickRef.current?.(place);
              console.log('✅ [WebMapRenderer] Phase 32.5: onMarkerClick 콜백 호출 완료');
            });
            markerListenersRef.current.push(listener);
            console.log('✅ [WebMapRenderer] Phase 32.5: Marker 클릭 리스너 등록 완료');
          }
        } else {
          console.warn('⚠️ [WebMapRenderer] Phase 32.5: onMarkerClick 핸들러가 없습니다. 마커 클릭이 작동하지 않을 수 있습니다.');
        }
        
        // 🔥 Phase 22: 추천 마커에 bounce 애니메이션 추가 (기본 Marker만)
        if (!useAdvancedMarker && isRecommended && !isSelected) {
          setTimeout(() => {
            (marker as google.maps.Marker).setAnimation(window.google.maps.Animation.BOUNCE);
            setTimeout(() => {
              (marker as google.maps.Marker).setAnimation(null);
            }, 2000);
          }, 1000);
        }
        
        // 🔥 Phase 23: 선택된 마커는 3초 후 애니메이션 제거 (기본 Marker만)
        if (!useAdvancedMarker && isSelected) {
          setTimeout(() => {
            (marker as google.maps.Marker).setAnimation(null);
          }, 3000);
        }
      } catch (error) {
        // 🔥 렌더링 방어: 에러 발생 시 console.warn만 찍고 넘어감 (앱 중단 방지)
        console.warn(`⚠️ [WebMapRenderer] 마커 생성 실패 (${place?.name || 'unknown'}):`, error, {
          placeId: place?.id,
          placeName: place?.name,
          lat: place?.lat,
          lng: place?.lng,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        // 🔥 에러 발생해도 앱 전체를 중단시키지 않음 (다음 place 계속 처리)
      }
    });

    // 🔥 다중 마커 확인: 이제 결과가 여러 개 들어올 거야. WebMapRenderer가 이 모든 장소에 대해 작은 핀(Marker)들을 지도에 뿌려주는지 최종 확인
    console.log(`✅ [WebMapRenderer] 마커 생성 완료: ${markersRef.current.length}개 (의정부역 주변 상세 핀 포함)`);
    console.log(`📊 [WebMapRenderer] 다중 마커 생성 통계:`, {
      totalPlaces: places.length,
      createdMarkers: markersRef.current.length,
      skippedPlaces: places.length - markersRef.current.length,
      allPlacesProcessed: places.length === markersRef.current.length,
      hasMultipleMarkers: markersRef.current.length > 1,
      markerDetails: places.map((p, i) => ({
        index: i,
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        hasMarker: i < markersRef.current.length,
      })),
    });
    console.log(`📍 [WebMapRenderer] 생성된 마커 목록:`, markersRef.current.map((m, i) => ({
      index: i,
      hasMap: !!m.getMap?.(),
      position: (m as any).position?.lat ? {
        lat: (m as any).position.lat(),
        lng: (m as any).position.lng(),
      } : 'N/A',
    })));
  }, [isMapReady, places, recommendedPlaceId, selectedPlaceId, previewPlace]); // 🔥 중복 마커 방지: places 변경 시마다 useEffect 재실행
  
  // 🔥 Phase 32.1: onMarkerClick 변경 시 ref 업데이트
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  // ✅ MVP: 현재 위치 마커 렌더링 (NAVIGATING 중 부드럽게 업데이트)
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.google?.maps?.Marker) {
      return;
    }

    // ✅ MVP: locationState가 READY일 때만 마커 표시/업데이트
    if (!locationState || locationState.status !== 'READY' || !locationState.lat || !locationState.lng) {
      // 위치가 없으면 기존 마커 제거
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setMap(null);
        currentLocationMarkerRef.current = null;
      }
      return;
    }

    // ✅ MVP: 기존 마커가 있으면 위치만 업데이트 (재생성 안 함, 부드러움)
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setPosition({
        lat: locationState.lat,
        lng: locationState.lng,
      });
      return;
    }

    // ✅ MVP: 마커가 없으면 새로 생성
    try {
      // 🔥 내 위치 마커: 경로의 시작점인 '내 위치'에 파란색 작은 점이나 아이콘을 표시해서 어디서부터 시작되는지 알 수 있게 해줘
      const markerOptions: google.maps.MarkerOptions = {
        map: mapRef.current!,
        position: { lat: locationState.lat, lng: locationState.lng },
        title: "내 위치 (경로 시작점)",
        // 🔥 내 위치 마커: 경로의 시작점임을 명확히 표시하기 위해 파란색 작은 점으로 설정
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12, // 🔥 내 위치 마커: 파란색 작은 점 크기 (경로 시작점 표시)
          fillColor: '#4285F4', // Google Maps 파란색 (경로 시작점 표시)
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3, // 흰색 테두리
        },
        zIndex: 3000, // 최상위 (다른 마커 위에 표시)
        optimized: false, // 성능 최적화 비활성화 (정확한 위치 표시)
      };

      // 🔥 강화: Marker 생성 전 최종 검증
      if (!window.google?.maps?.Marker) {
        console.warn('⚠️ [WebMapRenderer] 현재 위치 마커 생성 직전 API 확인 실패');
        return;
      }
      
      const marker = new window.google.maps.Marker(markerOptions);
      currentLocationMarkerRef.current = marker;
      
      console.log('[NAV] 현재 위치 마커 생성', {
        lat: locationState.lat,
        lng: locationState.lng,
      });
    } catch (error) {
      console.warn('⚠️ [WebMapRenderer] 현재 위치 마커 생성 실패:', error);
    }
  }, [isMapReady, locationState]); // ✅ MVP: locationState 변경 시 마커 위치 업데이트

  // 🔥 Phase 24: 스켈레톤 마커 렌더링 (검색 중일 때만)
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.google?.maps?.Marker) {
      return;
    }

    // 검색 중이 아니면 스켈레톤 마커 제거
    if (!isSearching || places.length > 0) {
      skeletonMarkersRef.current.forEach((marker) => marker.setMap(null));
      skeletonMarkersRef.current = [];
      return;
    }

    // 스켈레톤 마커가 이미 있으면 제거
    skeletonMarkersRef.current.forEach((marker) => marker.setMap(null));
    skeletonMarkersRef.current = [];

    // 지도 중심 기준 랜덤 3~5개 위치 생성
    const skeletonCount = 3 + Math.floor(Math.random() * 3); // 3~5개
    const skeletonPositions: Array<{ lat: number; lng: number }> = [];

    for (let i = 0; i < skeletonCount; i++) {
      // 중심 기준 ±0.01도 범위 내 랜덤 위치
      const offsetLat = (Math.random() - 0.5) * 0.02;
      const offsetLng = (Math.random() - 0.5) * 0.02;
      skeletonPositions.push({
        lat: center.lat + offsetLat,
        lng: center.lng + offsetLng,
      });
    }

    // 스켈레톤 마커 생성
    skeletonPositions.forEach((pos) => {
      try {
        // 🔥 강화: Marker 생성 전 최종 검증
        if (!window.google?.maps?.Marker) {
          console.warn('⚠️ [WebMapRenderer] 스켈레톤 마커 생성 직전 API 확인 실패 - 스킵');
          return;
        }
        
        const marker = new window.google.maps.Marker({
          map: mapRef.current!,
          position: pos,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#9ca3af', // gray-400
            fillOpacity: 0.6,
            strokeColor: '#FFFFFF',
            strokeWeight: 1,
          },
          zIndex: 50,
          animation: window.google.maps.Animation.DROP,
        });
        skeletonMarkersRef.current.push(marker);
      } catch (error) {
        console.warn('⚠️ [WebMapRenderer] 스켈레톤 마커 생성 실패:', error);
      }
    });

    console.log(`✅ [WebMapRenderer] Phase 24: 스켈레톤 마커 ${skeletonCount}개 생성`);

    return () => {
      skeletonMarkersRef.current.forEach((marker) => marker.setMap(null));
      skeletonMarkersRef.current = [];
    };
  }, [isMapReady, isSearching, places.length, center]);

  // ❌ 정상 지도 페이지: NAVIGATING 관련 코드 제거 (경로/내비 기능 제외)
  // const cameraInitializedRef = useRef(false);
  // useEffect(() => { ... }, [isMapReady, navigationStarted, locationState, routePath]);

  // 🔥 정상 지도 페이지: previewPlace가 있으면 fitBounds 로직 완전 차단
  // 🔥 목적지 확정 시 카메라 이동 (경로와 완전 분리, SELECTED/PRE_NAV에서 실행)
  // ✅ 목적지 확정은 경로 성공/실패와 무관하게 항상 실행
  // 🔥 핵심: PLACE_SELECTED 상태에서만 지도 상세 트리거
  const lastSelectedPlaceIdRef = useRef<string | undefined>(undefined); // 🔥 이전 selectedPlaceId 추적
  const lastZoomRef = useRef<number | null>(null); // 🔥 PRE_NAV에서 확대 유지용
  
  useEffect(() => {
    // 🔥 정상 지도 페이지: previewPlace가 있으면 fitBounds 로직 스킵
    if (previewPlace) {
      return;
    }
    
    if (!isMapReady || !mapRef.current) {
      return;
    }
    
    // 🔥 목적지 확정: 선택된 장소가 있으면 목적지 중심으로 확대 (SELECTED 상태)
    // ✅ navigationStarted와 무관하게 실행 (경로 실패해도 목적지 확대는 필수)
    if (selectedPlaceId && selectedPlaceId !== lastSelectedPlaceIdRef.current) {
      const selectedPlace = places.find(p => p.id === selectedPlaceId);
      
      if (selectedPlace) {
        // ✅ 좌표 유효성 검사
        const placeLat = typeof selectedPlace.lat === 'number' && !Number.isNaN(selectedPlace.lat) ? selectedPlace.lat : null;
        const placeLng = typeof selectedPlace.lng === 'number' && !Number.isNaN(selectedPlace.lng) ? selectedPlace.lng : null;
        
        if (placeLat !== null && placeLng !== null) {
          // 🔥 5단계: 지도 상세 확대 (fitBounds 사용 - 출발지 + 목적지 모두 포함)
          let targetZoom = 17; // 🔥 기본값 설정 (try 블록 밖에서 선언)
          
          try {
            const bounds = new window.google.maps.LatLngBounds();
            
            // 목적지 추가
            bounds.extend({ lat: placeLat, lng: placeLng });
            
            // 현재 위치가 있으면 추가 (출발지 + 목적지 모두 보이도록)
            if (locationState && locationState.lat && locationState.lng) {
              bounds.extend({ lat: locationState.lat, lng: locationState.lng });
            }
            
            // fitBounds로 경로 전체 보기 (축구장 상세 뷰)
            mapRef.current.fitBounds(bounds, {
              padding: 50, // 여백
            });
            
            // 줌 레벨 제한 (너무 멀거나 가까우면 조정)
            const currentZoom = mapRef.current.getZoom() || 14;
            targetZoom = Math.max(17, Math.min(currentZoom, 18)); // 🔥 최소 17, 최대 18
            mapRef.current.setZoom(targetZoom);
            
            console.log('✅ [WebMapRenderer] PLACE_SELECTED: fitBounds 완료', {
              targetZoom,
              hasOrigin: !!(locationState && locationState.lat && locationState.lng),
            });
          } catch (error) {
            // fitBounds 실패 시 panTo + setZoom으로 대체
            console.warn('⚠️ [WebMapRenderer] fitBounds 실패, panTo로 대체:', error);
            mapRef.current.panTo({ lat: placeLat, lng: placeLng });
            targetZoom = 17; // 🔥 catch 블록에서도 targetZoom 설정
            mapRef.current.setZoom(targetZoom);
          }
          
          lastSelectedPlaceIdRef.current = selectedPlaceId; // 🔥 이전 값 업데이트
          lastZoomRef.current = targetZoom; // 🔥 PRE_NAV에서 유지할 줌 레벨 저장
          
          console.log('✅ [WebMapRenderer] PLACE_SELECTED: 지도 상세 뷰 전환 완료', {
            name: selectedPlace.name,
            lat: selectedPlace.lat,
            lng: selectedPlace.lng,
            zoom: targetZoom,
            navigationStarted, // 🔥 경로 상태와 무관하게 실행
            selectedPlaceId,
            status: 'SELECTED', // 🔥 navUIState: SELECTED
          });
        } else {
          console.warn('⚠️ [WebMapRenderer] selectedPlace - 유효하지 않은 좌표', {
            lat: selectedPlace.lat,
            lng: selectedPlace.lng,
          });
        }
      } else {
        console.warn('⚠️ [WebMapRenderer] selectedPlaceId에 해당하는 장소를 찾을 수 없음:', {
          selectedPlaceId,
          placesCount: places.length,
          placesIds: places.map(p => p.id),
        });
      }
    }
  }, [isMapReady, selectedPlaceId, places, navigationStarted, previewPlace]); // 🔥 previewPlace 의존성 추가
  
  // ❌ 정상 지도 페이지: SELECTED/PRE_NAV 확대 유지 로직 제거 (navigation 기능 제외)
  
  // ✅ 정상 지도 페이지: 중심점 변경 (previewPlace 우선)
  useEffect(() => {
    if (!isMapReady || !mapRef.current) {
      return;
    }
    
    // 🔥 previewPlace가 있으면 다른 로직 스킵 (previewPlace useEffect에서 처리)
    if (previewPlace) {
      return;
    }
    
    // ❌ 정상 지도 페이지: NAVIGATING 관련 코드 제거
    // if (navigationStarted) { ... }
    
    // 🔥 Phase 24: 방향 힌트 표시 시 지도 카메라 조정 (줌 살짝 ↑, 앞쪽 공간이 더 많이 보이도록)
    if (showDirectionHint && locationState && destination) {
      // 현재 위치와 목적지의 중간점 계산
      const midLat = (locationState.lat + destination.lat) / 2;
      const midLng = (locationState.lng + destination.lng) / 2;
      
      // 지도 중심을 중간점으로 이동하고 줌 조정
      mapRef.current.setCenter({ lat: midLat, lng: midLng });
      
      // 줌 레벨 조정 (현재 줌보다 살짝 확대)
      const currentZoom = mapRef.current.getZoom() || 15;
      if (currentZoom < 16) {
        mapRef.current.setZoom(16);
      }
      
      console.log('[WebMapRenderer] 방향 힌트: 지도 카메라 조정');
      return;
    }
    
    // 🔥 핵심 수정: 내 위치 버튼 클릭 시 피드백 추가 (줌 + 애니메이션)
    // center.source === 'map'인 경우는 내 위치 버튼 클릭으로 판단
    if (center.source === 'map') {
      // ✅ 좌표 유효성 검사 (NaN, undefined 방지)
      const lat = typeof center.lat === 'number' && !Number.isNaN(center.lat) ? center.lat : null;
      const lng = typeof center.lng === 'number' && !Number.isNaN(center.lng) ? center.lng : null;
      
      if (lat === null || lng === null) {
        console.warn('⚠️ [WebMapRenderer] 내 위치 버튼 클릭 - 유효하지 않은 좌표', {
          lat: center.lat,
          lng: center.lng,
          latType: typeof center.lat,
          lngType: typeof center.lng,
        });
        return;
      }
      
      // ✅ mapRef null 체크 + 재시도 로직 (모바일 타이밍 이슈 대응)
      if (!mapRef.current) {
        console.warn('⚠️ [WebMapRenderer] 내 위치 버튼 클릭 - mapRef가 아직 준비되지 않음, 재시도 중...');
        // 🔥 재시도: 100ms 후 다시 시도 (최대 5회)
        let retryCount = 0;
        const maxRetries = 5;
        const retryInterval = setInterval(() => {
          retryCount++;
          if (mapRef.current) {
            clearInterval(retryInterval);
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(17);
            console.log('✅ [WebMapRenderer] 내 위치 버튼 클릭: 재시도 성공', {
              lat,
              lng,
              zoom: 17,
              retryCount,
            });
          } else if (retryCount >= maxRetries) {
            clearInterval(retryInterval);
            console.error('❌ [WebMapRenderer] 내 위치 버튼 클릭 - mapRef 준비 실패 (재시도 한도 초과)');
          }
        }, 100);
        return;
      }
      
      // ✅ 부드러운 애니메이션과 함께 줌 레벨 17로 설정
      mapRef.current.panTo({
        lat,
        lng,
      });
      
      // ✅ 줌 레벨 16으로 설정 (상세 타일 로딩 안정화)
      mapRef.current.setZoom(16);
      
      console.log('✅ [WebMapRenderer] 내 위치 버튼 클릭: 지도 이동 + 줌 완료', {
        lat,
        lng,
        zoom: 17,
        mapRefReady: !!mapRef.current,
      });
      return;
    }
    
    // 일반 중심점 변경 (좌표 유효성 검사)
    const centerLat = typeof center.lat === 'number' && !Number.isNaN(center.lat) ? center.lat : null;
    const centerLng = typeof center.lng === 'number' && !Number.isNaN(center.lng) ? center.lng : null;
    
    if (centerLat !== null && centerLng !== null) {
      mapRef.current.setCenter({ lat: centerLat, lng: centerLng });
    } else {
      console.warn('⚠️ [WebMapRenderer] setCenter - 유효하지 않은 좌표', {
        lat: center.lat,
        lng: center.lng,
      });
    }
  }, [isMapReady, center, selectedPlaceId, places, showDirectionHint, locationState, destination, navigationStarted]);

  // ❌ 정상 지도 페이지: 방향 힌트 선 완전 제거 (SEARCH ONLY 모드)
  // 🔥 Phase 27: 방향 힌트 렌더링 (전체 경로 대신 짧은 방향선만)
  useEffect(() => {
    // 🔥 정상 지도 페이지: 방향 힌트 완전 차단 (SEARCH ONLY 모드)
    if (directionHintRef.current) {
      directionHintRef.current.setMap(null);
      directionHintRef.current = null;
    }
    return;
    
    // ❌ 아래 코드는 실행되지 않음 (SEARCH ONLY 모드)
    if (!isMapReady || !mapRef.current || !showDirectionHint || !locationState || !destination) {
      if (directionHintRef.current) {
        directionHintRef.current.setMap(null);
        directionHintRef.current = null;
      }
      return;
    }

    if (!window.google?.maps?.Polyline) {
      return;
    }

    try {
      if (directionHintRef.current) {
        directionHintRef.current.setMap(null);
      }

      // 🔥 Phase 27: 현재 위치에서 목적지 방향으로 10~15% 거리의 짧은 선 계산
      const hintRatio = 0.12; // 12% (10~15% 범위 내)
      const hintLat = locationState.lat + (destination.lat - locationState.lat) * hintRatio;
      const hintLng = locationState.lng + (destination.lng - locationState.lng) * hintRatio;

      const directionHint = new window.google.maps.Polyline({
        path: [
          { lat: locationState.lat, lng: locationState.lng },
          { lat: hintLat, lng: hintLng },
        ],
        geodesic: true,
        strokeColor: '#3b82f6', // 🔥 Phase 27: 연한 블루
        strokeOpacity: 0.5, // 🔥 Phase 27: 반투명
        strokeWeight: 4,
        map: mapRef.current,
      });

      directionHintRef.current = directionHint;
      console.log('✅ [WebMapRenderer] Phase 27: 방향 힌트 선 생성 완료');

      // 🔥 Phase 27: 지도 카메라 조정 (줌 +1, 현재 위치는 하단, 앞쪽 공간 더 보여주기)
      const currentZoom = mapRef.current.getZoom() || 15;
      const newZoom = Math.min(currentZoom + 1, 19); // 최대 줌 제한
      
      // 🔥 Phase 27: 현재 위치는 하단에, 앞쪽 공간을 더 많이 보여주도록 중심점 조정
      // 목적지 방향으로 30% 지점을 중심으로 설정 (현재 위치는 하단에 보이도록)
      const centerLat = locationState.lat + (destination.lat - locationState.lat) * 0.3;
      const centerLng = locationState.lng + (destination.lng - locationState.lng) * 0.3;

      mapRef.current.setZoom(newZoom);
      mapRef.current.panTo({ lat: centerLat, lng: centerLng }); // 🔥 Phase 27: panTo 사용 (부드러운 이동)
      
      console.log('✅ [WebMapRenderer] Phase 27: 카메라 조정 완료 (줌 +1, 앞쪽 공간 강조)');
    } catch (error) {
      console.warn('⚠️ [WebMapRenderer] 방향 힌트 선 생성 실패:', error);
    }

    return () => {
      if (directionHintRef.current) {
        directionHintRef.current.setMap(null);
        directionHintRef.current = null;
      }
    };
  }, [isMapReady, showDirectionHint, locationState, destination]);

  // ✅ MVP: 경로 라인 렌더링 (PRE_NAV 또는 NAVIGATING 상태에서 routePath 있을 때)
  useEffect(() => {
    if (!isMapReady || !mapRef.current) {
      // 지도가 준비되지 않았으면 polyline 제거
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      return;
    }

    // 🔥 핵심: PRE_NAV 또는 NAVIGATING 상태에서 경로 표시
    // PRE_NAV: 연한 미리보기 라인 (navigationStarted === false)
    // NAVIGATING: 진한 안내 라인 (navigationStarted === true)
    // ❌ navigationStarted 조건 제거 - routePath/directionsResult만 확인
    const shouldShowRoute = (routePath && routePath.length > 0) || directionsResult;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[WebMapRenderer] 경로 라인 렌더링 체크:', {
        shouldShowRoute,
        hasRoutePath: !!(routePath && routePath.length > 0),
        routePathLength: routePath?.length || 0,
        hasDirectionsResult: !!directionsResult,
        navigationStarted,
      });
    }
    
    if (!shouldShowRoute) {
      // 경로가 없으면 기존 polyline 제거
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[WebMapRenderer] 경로 라인 제거: routePath/directionsResult 없음');
      }
      return;
    }
    
    // ✅ MVP: NAVIGATING 중 경로는 고정 표시 (재계산 안 함)
    // routePath가 이미 있으면 그대로 사용

    if (!window.google?.maps?.Polyline) {
      console.warn('⚠️ [WebMapRenderer] Polyline 클래스가 준비되지 않음');
      return;
    }

    // ✅ MVP: DirectionsRenderer 우선 사용 (더 정확한 경로 표시)
    if (directionsResult && window.google?.maps?.DirectionsRenderer) {
      try {
        // 기존 Polyline 제거 (DirectionsRenderer가 대체)
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }

        // 🔥 렌더러 상태 확인: WebMapRenderer.tsx에서 directionsRenderer가 초기화될 때 directionsRenderer.setMap(map)이 확실히 실행되었는지 확인하고, 경로가 그려질 때 기존 선을 지우는 setMap(null) 후 다시 setMap(map)을 호출하는 로직을 점검
        // 기존 DirectionsRenderer 제거 (기존 선 지우기)
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null); // 🔥 렌더러 상태 확인: 기존 선을 지우는 setMap(null)
          directionsRendererRef.current = null;
        }
        
        // 🔥 STEP 3: DirectionsRenderer가 map에 제대로 연결되는지 확인
        if (!mapRef.current) {
          console.warn('⚠️ [WebMapRenderer] mapRef.current가 null → DirectionsRenderer 생성 불가');
          return;
        }
        
        // 🔥 1단계: 티맵 스타일 경로 시각화 - 현재 DirectionsRenderer의 기본 스타일을 티맵 스타일로 바꿔줘
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true, // 기존 마커 유지
          preserveViewport: false, // 🔥 카메라 줌 최적화: 출발지와 도착지가 한 화면에 꽉 차게 자동으로 줌이 조절되게 해줘
          polylineOptions: {
            strokeColor: '#1A5FFF', // 🔥 1단계: 티맵 스타일 - 경로 선 색상을 #1A5FFF(진한 파란색)로 설정하고
            strokeWeight: 8, // 🔥 1단계: 티맵 스타일 - 두께(strokeWeight)를 8 정도로 굵게 해줘
            strokeOpacity: 1.0, // 🔥 불투명
            icons: [{
              // 🔥 1단계: 티맵 스타일 - 경로 위에 진행 방향을 나타내는 화살표 아이콘 패턴을 일정 간격으로 넣어줘
              icon: {
                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 5, // 🔥 티맵 스타일: 화살표 크기 증가
                strokeColor: '#1A5FFF',
                fillColor: '#1A5FFF',
                fillOpacity: 1.0,
                strokeWeight: 2,
              },
              offset: '0%', // 경로 시작부터 화살표
              repeat: '80px', // 🔥 1단계: 티맵 스타일 - 80px마다 화살표 반복 (더 촘촘하게)
            }],
          },
        });
        
        directionsRendererRef.current = directionsRenderer;
        // 🔥 렌더러 상태 확인: WebMapRenderer.tsx에서 directionsRenderer가 초기화될 때 directionsRenderer.setMap(map)이 확실히 실행되었는지 확인
        directionsRenderer.setMap(mapRef.current); // 🔥 명시적으로 setMap 호출하여 연결 확인 (기존 선 지운 후 다시 setMap)
        
        // 🔥 경로 표시 실행: MapController에서 경로 계산이 성공하면, 그 결과(response)를 directionsRenderer.setDirections(response)에 전달
        directionsRenderer.setDirections(directionsResult);
        console.log('✅ [WebMapRenderer] DirectionsRenderer: setDirections success', {
          hasMap: !!mapRef.current,
          hasDirections: !!directionsResult,
          rendererConnected: directionsRenderer.getMap() === mapRef.current, // 🔥 Renderer 연결 확인
          directionsStatus: directionsResult?.routes?.[0] ? 'OK' : 'NO_ROUTES',
        });
        
        // 🔥 지도 인터랙션: '길찾기' 클릭 시 지도의 채도를 살짝 낮추고(Grayscale), 경로 라인(Polyline)만 선명한 파란색으로 강조해줘
        if (mapRef.current) {
          // 🔥 지도 인터랙션: 지도 컨테이너에 grayscale 필터 적용
          const mapContainer = mapRef.current.getDiv();
          if (mapContainer) {
            mapContainer.style.filter = 'grayscale(0.3)'; // 🔥 지도 인터랙션: 채도를 살짝 낮추고
            console.log('✅ [WebMapRenderer] 지도 grayscale 필터 적용');
          }
        }
        
        // 🔥 소요 시간 표시: 경로 라인 중앙이나 목적지 마커 위에 '대중교통 약 15분' 같은 소요 시간 툴팁을 띄워줘
        if (directionsResult?.routes?.[0]?.legs?.[0]) {
          const leg = directionsResult.routes[0].legs[0];
          const duration = leg.duration?.text || '';
          const distance = leg.distance?.text || '';
          const travelMode = directionsResult.routes[0]?.legs?.[0]?.steps?.[0]?.travel_mode || 'TRANSIT';
          
          // 🔥 소요 시간 표시: 경로 중앙 위치 계산
          const route = directionsResult.routes[0];
          const path = route.overview_path || [];
          if (path.length > 0) {
            const midIndex = Math.floor(path.length / 2);
            const midPoint = path[midIndex];
            
            // 🔥 소요 시간 표시: 기존 InfoWindow 제거
            if (routeInfoWindowRef.current) {
              routeInfoWindowRef.current.close();
            }
            
            // 🔥 소요 시간 표시: 새로운 InfoWindow 생성
            const modeText = travelMode === 'TRANSIT' ? '대중교통' : travelMode === 'DRIVING' ? '자동차' : '도보';
            const infoContent = `
              <div style="
                padding: 8px 12px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                font-size: 13px;
                font-weight: 600;
                color: #1a73e8;
                white-space: nowrap;
              ">
                ${modeText} 약 ${duration}
              </div>
            `;
            
            routeInfoWindowRef.current = new window.google.maps.InfoWindow({
              content: infoContent,
              position: midPoint,
            });
            
            routeInfoWindowRef.current.open(mapRef.current);
            console.log('✅ [WebMapRenderer] 소요 시간 표시:', { duration, distance, modeText });
          }
        }
      } catch (error) {
        console.warn('⚠️ [WebMapRenderer] DirectionsRenderer 생성 실패, Polyline으로 fallback:', error);
        // Fallback: Polyline 사용
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
        }
        // 🔥 PRE_NAV: 연한 미리보기 라인, NAVIGATING: 진한 안내 라인
        const isPreview = !navigationStarted; // PRE_NAV 상태
        const polyline = new window.google.maps.Polyline({
          path: routePath,
          geodesic: true,
          strokeColor: isPreview ? '#10b981' : '#059669', // 🔥 PRE_NAV: 연한 초록색, NAVIGATING: 진한 초록색
          strokeOpacity: isPreview ? 0.4 : 0.7, // 🔥 PRE_NAV: 반투명, NAVIGATING: 불투명
          strokeWeight: isPreview ? 3 : 5, // 🔥 PRE_NAV: 얇게, NAVIGATING: 두껍게
          map: mapRef.current,
        });
        polylineRef.current = polyline;
        console.log('✅ [WebMapRenderer] 경로 라인 표시 완료 (Polyline fallback)');
      }
    } else {
      // ✅ MVP: DirectionsRenderer가 없으면 Polyline 사용
      // 기존 DirectionsRenderer 제거
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }

      // 기존 Polyline 제거
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }

      try {
        // 🔥 PRE_NAV: 연한 미리보기 라인, NAVIGATING: 진한 안내 라인
        const isPreview = !navigationStarted; // PRE_NAV 상태
        const polyline = new window.google.maps.Polyline({
          path: routePath,
          geodesic: true,
          strokeColor: isPreview ? '#10b981' : '#059669', // 🔥 PRE_NAV: 연한 초록색, NAVIGATING: 진한 초록색
          strokeOpacity: isPreview ? 0.4 : 0.7, // 🔥 PRE_NAV: 반투명, NAVIGATING: 불투명
          strokeWeight: isPreview ? 3 : 5, // 🔥 PRE_NAV: 얇게, NAVIGATING: 두껍게
          map: mapRef.current,
        });
        polylineRef.current = polyline;
        console.log('[ROUTE] polyline rendered', {
          pathLength: routePath.length,
          color: '#10b981',
        });
      } catch (error) {
        console.warn('⚠️ [WebMapRenderer] 경로 선 생성 실패:', error);
      }
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      // 🔥 소요 시간 표시: cleanup 시 InfoWindow 제거
      if (routeInfoWindowRef.current) {
        routeInfoWindowRef.current.close();
        routeInfoWindowRef.current = null;
      }
    };
  }, [isMapReady, navigationStarted, routePath, directionsResult]); // ✅ MVP: routePath를 dependency에 추가

  // 🔥 즉시 해결: 지도 영역 확보 - MapContainer의 높이를 100vh로 고정하고, 다른 UI 요소들이 지도의 터치 이벤트를 방해하지 않도록 pointer-events: none과 auto를 적절히 배분해줘
  return (
    <div 
      className="map-wrapper-first-child"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh', // 🔥 즉시 해결: 지도 영역 확보 - MapContainer의 높이를 100vh로 고정하고
        zIndex: 1, // 🔥 지도 레이어
        borderRadius: 0,
        boxShadow: 'none',
        border: 'none',
        overflow: 'hidden',
        padding: 0,
        margin: 0,
        pointerEvents: 'auto', // 🔥 즉시 해결: 지도 영역 확보 - 지도는 터치 이벤트 보장
      }}
    >
      {/* ❌ 정상 지도 페이지: navigationStarted UI 제거 */}
      {false && navigationStarted && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-black text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          이동 중이에요
        </div>
      )}
      
      {/* 🔥 STEP 4: 지도 중앙 crosshair (선택 기준점) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          pointerEvents: 'none',
          opacity: 0.4,
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            position: 'relative',
          }}
        >
          {/* 가로선 */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '0',
              width: '100%',
              height: '2px',
              backgroundColor: '#1a1a1a',
              transform: 'translateY(-50%)',
            }}
          />
          {/* 세로선 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '0',
              width: '2px',
              height: '100%',
              backgroundColor: '#1a1a1a',
              transform: 'translateX(-50%)',
            }}
          />
        </div>
      </div>
      
      {/* 🔥 천재 모드: 지도 컨테이너 (명시적 크기) */}
      <div
        className="relative map-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'auto', // ✅ MVP: 지도 터치 이벤트 보장
        }}
      >
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            touchAction: "pan-x pan-y",
            overscrollBehavior: "contain",
            pointerEvents: 'auto', // ✅ MVP: 지도 컨테이너 터치 이벤트 보장
          }}
        />
      </div>
    </div>
  );
}
