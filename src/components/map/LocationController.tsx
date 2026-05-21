import { useState, useCallback, useEffect, useRef } from "react";
import { getUserLocation } from "@/lib/getUserLocation";
import type { LocationState } from "@/types/location"; // 🔥 Phase L: 타입은 types에서 import

// 🔥 Phase L: Vite 호환성을 위해 타입 re-export
export type { LocationState, LocationSource, LocationStatus } from "@/types/location";

// 🔥 고정 위치: 경기도 의정부시 용민로 420 (37.754, 127.114) - 정확한 좌표
const MVP_LOCATION = {
  lat: 37.754,
  lng: 127.114,
  accuracy: 20,
  status: 'READY' as const,
};

const DEFAULT_LOCATION: LocationState = {
  lat: 37.754,
  lng: 127.114,
  accuracy: undefined,
  updatedAt: Date.now(),
  source: 'default',
  status: 'INIT',
};

export function useLocationController() {
  const [location, setLocation] = useState<LocationState>(DEFAULT_LOCATION);
  const readySinceRef = useRef<number | null>(null); // ✅ MVP: READY 상태 유지 시작 시간
  const errorCountRef = useRef<number>(0); // ✅ MVP: 연속 ERROR 카운트

  // ✅ MVP: READY 안정화 로직 (10초 이상 유지되어야 안정으로 간주)
  const STABLE_READY_DURATION = 10000; // 10초
  const MAX_ERROR_COUNT = 3; // 연속 3회 ERROR면 불안정으로 간주

  // 🔥 MVP: GPS 무시하고 고정 위치 항상 READY 반환
  useEffect(() => {
    // ✅ MVP: GPS 로직 전부 무시하고 고정 위치로 즉시 READY 설정
    const updateLocation = () => {
      const now = Date.now();
      const newLocation: LocationState = {
        lat: MVP_LOCATION.lat,
        lng: MVP_LOCATION.lng,
        accuracy: MVP_LOCATION.accuracy,
        updatedAt: now,
        source: 'mvp-fixed',
        status: MVP_LOCATION.status,
      };
      
      // ✅ MVP: 릴리즈 - 위치 로그는 DEBUG로
      if (process.env.NODE_ENV === 'development') {
        console.debug('[LOC][MVP] forced location READY', {
          lat: MVP_LOCATION.lat,
          lng: MVP_LOCATION.lng,
          accuracy: MVP_LOCATION.accuracy,
          status: MVP_LOCATION.status,
        });
      }
      
      // ✅ MVP: 안정화 시간 즉시 시작 (항상 안정화된 상태)
      readySinceRef.current = now;
      errorCountRef.current = 0;
      
      setLocation(newLocation);
    };
    
    // 즉시 실행
    updateLocation();
    
    // cleanup은 필요 없음 (고정 위치이므로)
    return () => {
      readySinceRef.current = null;
      errorCountRef.current = 0;
    };
  }, []);

  // 🔥 기존 requestGeolocation은 호환성을 위해 유지 (자동 watchPosition이 우선)
  const requestGeolocation = useCallback(async () => {
    // watchPosition이 이미 실행 중이므로 별도 처리 불필요
    console.log('📍 [LocationController] requestGeolocation 호출 (watchPosition이 이미 실행 중)');
  }, []);

  const updateFromMap = useCallback((lat: number, lng: number) => {
    const newLocation: LocationState = {
      lat,
      lng,
      accuracy: undefined,
      updatedAt: Date.now(),
      source: 'map',
      status: 'READY',
    };
    // ✅ MVP: 지도 중심점으로 업데이트 시에도 안정화 시간 시작
    readySinceRef.current = Date.now();
    errorCountRef.current = 0;
    setLocation(newLocation);
    console.log('[LOC] update - 지도 중심점으로 위치 업데이트', {
      lat: newLocation.lat,
      lng: newLocation.lng,
      status: newLocation.status,
    });
  }, []);

  // ✅ MVP: 안정화된 READY 여부 확인 (10초 이상 유지)
  const isStableReady = useCallback((): boolean => {
    if (location.status !== 'READY') return false;
    if (!readySinceRef.current) return false;
    const readyDuration = Date.now() - readySinceRef.current;
    return readyDuration >= STABLE_READY_DURATION;
  }, [location.status]);

  return {
    location,
    requestGeolocation,
    updateFromMap,
    isStableReady, // ✅ MVP: 안정화된 READY 여부 확인 함수
  };
}
