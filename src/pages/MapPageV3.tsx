/**
 * 🔥 MapPageV3 - 단순 지도 컴포넌트
 * 
 * 원칙: 지도는 그리기만 한다 (판단·요청·검색 금지)
 * 
 * 책임 범위:
 * ✅ Google Map 1개 생성
 * ✅ map 인스턴스 안전하게 보관
 * ✅ 전달받은 좌표로 마커를 그림
 * ✅ 지도 준비 완료 상태 관리
 * 
 * ❌ 하지 않는 것:
 * - Geolocation 요청
 * - Places API 호출
 * - 음성/STT 처리
 * - "근처 / 내 주변" 판단
 * - UX 문구 출력
 * - 에러 판단
 */

import { useEffect, useRef, useState } from "react";
import { loadGoogleMap } from "@/lib/loadGoogleMap";

type MapCenter = {
  lat: number;
  lng: number;
};

type MapPlace = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

type MapPageV3Props = {
  center: MapCenter;        // 항상 유효한 숫자
  places: MapPlace[];       // 이미 정제된 결과
  recommendedPlaceId?: string; // 🔥 Phase 7: 추천 장소 ID (시각적 강조용)
  routePath?: google.maps.LatLngLiteral[]; // 🔥 Phase 9: 경로 좌표 배열
  navigationStarted?: boolean; // 🔥 Phase 9: 길 안내 시작 여부
  onMapReady?: () => void; // 🔥 Phase 13: 지도 준비 완료 콜백
};

export default function MapPageV3({ center, places, recommendedPlaceId, routePath = [], navigationStarted = false, onMapReady }: MapPageV3Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null); // 🔥 Phase 9: 경로 선
  const [isMapReady, setIsMapReady] = useState(false);
  const isInitializingRef = useRef(false);

  // 🔥 지도 초기화 (최초 1회만, containerRef가 준비되면 실행)
  useEffect(() => {
    // 🔥 containerRef가 준비될 때까지 대기
    const initMap = async () => {
      // 최대 2초 대기 (containerRef가 준비될 때까지)
      let retryCount = 0;
      while (!containerRef.current && retryCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
      }

      // 🔥 강력한 가드: ref가 없거나 이미 지도가 생성되었으면 즉시 종료
      if (!containerRef.current) {
        console.error("❌ [MapPageV3] containerRef가 준비되지 않았습니다.");
        return;
      }

      if (mapRef.current) {
        console.log("⚠️ [MapPageV3] 이미 지도가 생성되었습니다.");
        return;
      }

      // 🔥 중복 실행 방지
      if (isInitializingRef.current) {
        console.log("⚠️ [MapPageV3] 이미 초기화 중입니다.");
        return;
      }
      
      isInitializingRef.current = true;
      let cancelled = false;

      console.log('🔄 [MapPageV3] 지도 초기화 시작...', {
        containerRef: !!containerRef.current,
        containerHeight: containerRef.current.offsetHeight,
        containerWidth: containerRef.current.offsetWidth,
        center
      });

      // 🔥 컨테이너 높이가 0이면 경고
      if (containerRef.current.offsetHeight === 0 || containerRef.current.offsetWidth === 0) {
        console.warn('⚠️ [MapPageV3] 컨테이너 크기가 0입니다!', {
          height: containerRef.current.offsetHeight,
          width: containerRef.current.offsetWidth
        });
      }

      // 🔥 통일된 importLibrary 방식 사용
      import("@/lib/loadGoogleMap").then(({ loadMapLibrary }) => {
        return loadMapLibrary();
      })
        .then(async ({ Map }) => {
          if (cancelled || !containerRef.current) {
            console.warn('⚠️ [MapPageV3] 취소되었거나 containerRef가 없음');
            isInitializingRef.current = false;
            return;
          }

          console.log('✅ [MapPageV3] Google Maps API 로드 완료, 지도 생성 중...', {
            containerSize: {
              height: containerRef.current.offsetHeight,
              width: containerRef.current.offsetWidth
            }
          });

          // 🔥 지도 생성 (importLibrary 방식)
          const map = new Map(containerRef.current, {
            center: center,
            zoom: 15,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
          });

          if (cancelled) {
            console.warn('⚠️ [MapPageV3] 지도 생성 후 취소됨');
            isInitializingRef.current = false;
            return;
          }

          mapRef.current = map;
          setIsMapReady(true);
          console.log('✅ [MapPageV3] 지도 준비 완료', {
            center,
            mapSize: {
              height: containerRef.current.offsetHeight,
              width: containerRef.current.offsetWidth
            }
          });
          
          // 🔥 Phase 13: 지도 준비 완료 콜백 호출
          if (onMapReady) {
            onMapReady();
          }
        })
        .catch((err) => {
          if (!cancelled) {
            console.error('❌ [MapPageV3] 지도 로드 실패:', err);
          }
          isInitializingRef.current = false;
        });
    };

    initMap();

    return () => {
      isInitializingRef.current = false;
    };
  }, []); // 최초 1회만 실행

  // 🔥 마커 렌더링 (isMapReady === true 이후)
  useEffect(() => {
    // 🛑 필수 안정성 가드
    if (!isMapReady || !mapRef.current) {
      return;
    }

    // 🛑 Marker 클래스 존재 체크
    if (!window.google?.maps?.Marker || typeof window.google.maps.Marker !== 'function') {
      console.warn('⚠️ [MapPageV3] Marker 클래스가 준비되지 않음');
      return;
    }

    // 🛑 기존 마커 제거
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // 🔥 새 마커 생성
    places.forEach((place) => {
      // 🛑 좌표 유효성 검사
      if (
        typeof place.lat !== "number" ||
        typeof place.lng !== "number" ||
        isNaN(place.lat) ||
        isNaN(place.lng)
      ) {
        return;
      }

      try {
        // 🔥 Phase 7: 추천 장소는 시각적 강조
        const isRecommended = recommendedPlaceId === place.id;
        
        const markerOptions: google.maps.MarkerOptions = {
          map: mapRef.current!,
          position: { lat: place.lat, lng: place.lng },
          title: place.name,
        };

        // 🔥 Phase 7: 추천 마커 스타일 (빨강, 크기 1.2x, zIndex 최상위)
        if (isRecommended) {
          markerOptions.icon = {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12, // 기본 10의 1.2배
            fillColor: '#EF4444', // 빨강
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          };
          markerOptions.zIndex = 1000; // 추천 마커 최상위
        }
        
        const marker = new window.google.maps.Marker(markerOptions);
        markersRef.current.push(marker);
      } catch (error) {
        console.warn(`⚠️ [MapPageV3] 마커 생성 실패 (${place.name}):`, error);
      }
    });

    console.log(`✅ [MapPageV3] 마커 ${markersRef.current.length}개 생성 완료`, {
      recommendedPlaceId,
    });
  }, [isMapReady, places, recommendedPlaceId]);

  // 🔥 중심점 변경
  useEffect(() => {
    if (!isMapReady || !mapRef.current) {
      return;
    }

    mapRef.current.setCenter(center);
  }, [isMapReady, center]);

  // 🔥 Phase 9: 경로 렌더링 (navigationStarted && routePath 있을 때)
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !navigationStarted || routePath.length === 0) {
      // 경로가 없으면 기존 polyline 제거
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    if (!window.google?.maps?.Polyline) {
      console.warn('⚠️ [MapPageV3] Polyline 클래스가 준비되지 않음');
      return;
    }

    // 기존 polyline 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // 새 polyline 생성
    try {
      const polyline = new window.google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: '#000000',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map: mapRef.current,
      });
      polylineRef.current = polyline;
      console.log('✅ [MapPageV3] 경로 선 렌더링 완료:', routePath.length, '개 좌표');
    } catch (error) {
      console.warn('⚠️ [MapPageV3] 경로 선 생성 실패:', error);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [isMapReady, navigationStarted, routePath]);

  // 🔥 지도 컨테이너와 내부 구조를 직접 렌더링
  const mapHeight = 600; // 고정 높이

  return (
    <div className="w-full relative">
      {/* 🔥 Phase 9: 실행 상태 배지 */}
      {navigationStarted && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-black text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          이동 중이에요
        </div>
      )}
      
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm w-full">
        <div
          className="relative w-full"
          style={{
            height: `${mapHeight}px`,
            pointerEvents: "auto",
          }}
        >
          <div
            ref={containerRef}
            className="absolute inset-0 h-full w-full"
            style={{
              pointerEvents: "auto",
              touchAction: "pan-x pan-y",
              overscrollBehavior: "contain",
            }}
          />
        </div>
      </div>
    </div>
  );
}
