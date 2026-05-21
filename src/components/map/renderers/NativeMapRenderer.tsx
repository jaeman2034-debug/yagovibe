/**
 * 🔥 Phase 18: Native Map Renderer (React Native / Expo)
 * 
 * 책임: react-native-maps를 사용한 지도 렌더링
 * 
 * 원칙: 지도는 그리기만 한다 (판단·요청·검색 금지)
 * 
 * ⚠️ 주의: 이 파일은 React Native 환경에서만 동작합니다.
 * Web에서는 WebMapRenderer를 사용합니다.
 * 
 * 🔥 웹 빌드에서 완전히 제외: 웹 환경에서는 이 컴포넌트가 렌더되지 않도록 함
 */

import React, { useEffect, useRef, useState } from 'react';
import type { MapPageV3Props } from '@/types/map';

// 🔥 웹 환경 체크 (빌드 타임에 제외)
const isWeb = typeof window !== 'undefined' && typeof (window as any).navigator !== 'undefined' && (window as any).navigator.product !== 'ReactNative';

// 🔥 Phase 18: React Native 환경에서만 동적 import
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

// React Native 환경 체크
const isReactNative = typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative';

if (isReactNative && !isWeb) {
  try {
    // @ts-ignore - React Native 환경에서만 존재
    const RNMaps = require('react-native-maps');
    MapView = RNMaps.default;
    Marker = RNMaps.Marker;
    Polyline = RNMaps.Polyline;
  } catch (error) {
    console.warn('⚠️ [NativeMapRenderer] react-native-maps를 로드할 수 없습니다:', error);
  }
}

export default function NativeMapRenderer({
  center,
  places,
  recommendedPlaceId,
  selectedPlaceId, // 🔥 Phase 23: 선택된 장소 ID (피드백용)
  routePath = [],
  navigationStarted = false,
  showDirectionHint = false, // 🔥 Phase 24: 방향 힌트 표시 여부
  locationState = null, // 🔥 Phase 24: 현재 위치
  destination = null, // 🔥 Phase 24: 목적지
  onMapReady,
}: MapPageV3Props) {
  // 🔥 웹 환경 안전장치: 웹에서 불렸으면 즉시 에러 (실수 방지)
  if (typeof window !== 'undefined' && (window as any).navigator?.product !== 'ReactNative') {
    throw new Error('❌ NativeMapRenderer는 웹 환경에서 로드될 수 없습니다. WebMapRenderer를 사용하세요.');
  }

  const mapRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // 🔥 지도 준비 완료
  useEffect(() => {
    if (mapRef.current && !isMapReady) {
      setIsMapReady(true);
      if (onMapReady) {
        onMapReady();
      }
    }
  }, [mapRef.current, isMapReady, onMapReady]);

  // 🔥 중심점 변경
  useEffect(() => {
    if (isMapReady && mapRef.current) {
      // 🔥 Phase 23: 선택된 장소가 있으면 부드럽게 이동
      if (selectedPlaceId) {
        const selectedPlace = places.find(p => p.id === selectedPlaceId);
        if (selectedPlace) {
          mapRef.current.animateToRegion({
            latitude: selectedPlace.lat,
            longitude: selectedPlace.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          console.log('[NativeMapRenderer] 선택된 장소로 지도 이동:', selectedPlace.name);
          return;
        }
      }
      
      // 일반 중심점 변경
      mapRef.current.animateToRegion({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [isMapReady, center, selectedPlaceId, places]);

  // 🔥 React Native 환경이 아니거나 MapView가 없으면 플레이스홀더
  if (!isReactNative || !MapView) {
    return (
      <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-sm">모바일 지도 렌더러</p>
          <p className="text-xs mt-1">react-native-maps 설치 필요</p>
        </div>
      </div>
    );
  }

  // 🔥 React Native 스타일 (react-native-web에서도 동작)
  const containerStyle = {
    flex: 1,
    height: 600,
  };

  const mapStyle = {
    flex: 1,
  };

  return (
    <div style={containerStyle}>
      {navigationStarted && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
          backgroundColor: '#000000',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: 9999,
          fontSize: 14,
          fontWeight: 500,
        }}>
          이동 중이에요
        </div>
      )}
      
      <MapView
        ref={mapRef}
        style={mapStyle}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        onMapReady={() => {
          setIsMapReady(true);
          if (onMapReady) {
            onMapReady();
          }
        }}
      >
        {/* 마커 렌더링 */}
        {places.map((place) => {
          if (
            typeof place.lat !== "number" ||
            typeof place.lng !== "number" ||
            isNaN(place.lat) ||
            isNaN(place.lng)
          ) {
            return null;
          }

          const isRecommended = recommendedPlaceId === place.id;
          const isSelected = selectedPlaceId === place.id; // 🔥 Phase 23: 선택된 장소 확인
          
          return (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.lat,
                longitude: place.lng,
              }}
              title={place.name}
              pinColor={isSelected ? '#EF4444' : isRecommended ? '#EF4444' : undefined}
              opacity={isSelected ? 1 : isRecommended ? 1 : 0.6} // 🔥 Phase 23: 선택된 마커는 불투명, 나머지는 흐리게
            />
          );
        })}

        {/* 경로 렌더링 */}
        {navigationStarted && routePath.length > 0 && (
          <Polyline
            coordinates={routePath.map(p => ({
              latitude: p.lat,
              longitude: p.lng,
            }))}
            strokeColor="#000000"
            strokeWidth={5}
          />
        )}
      </MapView>
    </div>
  );
}
