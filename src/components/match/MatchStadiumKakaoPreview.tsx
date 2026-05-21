import { useEffect, useRef, useState } from "react";
import { isGoogleMapsLoaded, loadGoogleMapsAPI } from "@/utils/googleMapsLoader";

const SEOUL = { lat: 37.5665, lng: 126.978 };

type Props = {
  lat?: number | null;
  lng?: number | null;
  className?: string;
};

/**
 * 경기 위치 섹션용 카카오맵 미리보기.
 * VITE_KAKAO_JS_KEY 없으면 안내 문구만 표시 (동적 스크립트 로드).
 */
export function MatchStadiumKakaoPreview({
  lat,
  lng,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  latRef.current = lat;
  lngRef.current = lng;

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const applyPositionRef = useRef<(() => void) | null>(null);

  const [error, setError] = useState<string | null>(null);

  const hasKey = Boolean(
    typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === "string" &&
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY.trim()
  );

  useEffect(() => {
    if (!hasKey || !containerRef.current) return;

    let destroyed = false;
    const el = containerRef.current;

    loadGoogleMapsAPI()
      .then(() => {
        if (destroyed || !el) return;
        if (!isGoogleMapsLoaded() || !window.google?.maps) {
          throw new Error("Google Maps API 미로드");
        }

        const la = latRef.current;
        const ln = lngRef.current;
        const hasPin = la != null && ln != null;
        const center = hasPin ? { lat: la, lng: ln } : SEOUL;
        const map = new window.google.maps.Map(el, {
          center,
          zoom: hasPin ? 15 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;
        markerRef.current = hasPin
          ? new window.google.maps.Marker({ position: center, map })
          : null;

        applyPositionRef.current = () => {
          const m = mapRef.current;
          if (!m || !window.google?.maps) return;
          const a = latRef.current;
          const b = lngRef.current;
          const pin = a != null && b != null;
          if (pin) {
            const pos = { lat: a, lng: b };
            m.setCenter(pos);
            m.setZoom(15);
            if (markerRef.current) markerRef.current.setPosition(pos);
            else markerRef.current = new window.google.maps.Marker({ position: pos, map: m });
          } else {
            if (markerRef.current) {
              markerRef.current.setMap(null);
              markerRef.current = null;
            }
            m.setCenter(SEOUL);
            m.setZoom(12);
          }
        };

        applyPositionRef.current();
        setError(null);
      })
      .catch((e) => {
        console.error("❌ [MatchStadiumKakaoPreview] Kakao map load failed:", e);
        if (destroyed) return;
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        setError(
          isLocal
            ? "지도를 불러오지 못했습니다. 카카오 콘솔의 플랫폼(Web) 허용 도메인에 localhost가 등록되어 있는지 확인하세요."
            : "지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
        );
      });

    return () => {
      destroyed = true;
      applyPositionRef.current = null;
      mapRef.current = null;
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, [hasKey]);

  useEffect(() => {
    applyPositionRef.current?.();
  }, [lat, lng]);

  if (!hasKey) {
    return (
      <div
        className={`flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 text-center text-xs text-gray-500 ${className}`}
      >
        <p>
          Google Maps 키(<code className="text-[11px]">VITE_GOOGLE_MAPS_API_KEY</code>
          )가 있으면 여기에 구장 위치가 표시됩니다.
        </p>
        <p className="mt-1">「지도에서 선택」으로 핀을 찍을 수 있어요.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex h-40 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 ${className}`}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`h-40 w-full overflow-hidden rounded-lg border border-gray-200 shadow-sm ${className}`}
      aria-hidden
    />
  );
}
