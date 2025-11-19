import { useEffect, useState } from "react";
import type { LatLng } from "@/utils/geo";

// 기본 좌표 (서울 시청)
const DEFAULT_LOCATION: LatLng = {
  lat: 37.5665,
  lng: 126.9780,
};

const STORAGE_KEY = "userLoc";

export function useUserLocation() {
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      // Geolocation 미지원 → 저장된 위치 또는 기본 위치 사용
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as LatLng;
          setLoc(parsed);
        } catch {
          setLoc(DEFAULT_LOCATION);
        }
      } else {
        setLoc(DEFAULT_LOCATION);
      }
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // GPS 성공 → 정상 위치 사용 + localStorage에 저장
        const { latitude, longitude } = pos.coords;
        const location: LatLng = { lat: latitude, lng: longitude };
        
        setLoc(location);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
        setLoading(false);
        setError(null);
      },
      (err) => {
        // GPS 거부/실패 → 마지막 저장된 위치 사용
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as LatLng;
            setLoc(parsed);
            setError(null);
          } catch {
            setLoc(DEFAULT_LOCATION);
            setError("저장된 위치를 불러올 수 없습니다. 기본 위치를 사용합니다.");
          }
        } else {
          // 저장된 위치 없음 → 기본 지역 좌표 사용
          setLoc(DEFAULT_LOCATION);
          setError("위치 정보를 가져올 수 없습니다. 기본 위치를 사용합니다.");
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5분 캐시
      }
    );
  }, []);

  return { loc, loading, error };
}

