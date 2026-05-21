/**
 * 🔥 지도 위치 선택 모달
 * 
 * 역할:
 * - 지도에서 위치 클릭
 * - 좌표 → 주소 변환
 * - 선택한 위치를 폼에 전달
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from "@/utils/googleMapsLoader";

declare global {
  interface Window {
    google: typeof google;
  }
}

interface MapPickerModalProps {
  onSelect: (lat: number, lng: number, name: string) => void;
  onClose: () => void;
}

export default function MapPickerModal({ onSelect, onClose }: MapPickerModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapsLoading, setMapsLoading] = useState(true);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // 🔥 Reverse Geocoding 함수 (좌표 → 주소) - useCallback으로 메모이제이션
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    // 🔥 Google Maps API 로드 확인
    if (!window.google || !window.google.maps) {
      console.error("❌ [MapPickerModal] Google Maps API가 로드되지 않았습니다.");
      setSelectedLocation({
        lat,
        lng,
        name: `위치 (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
      });
      return;
    }
    
    setLoading(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({
        location: { lat, lng },
        language: "ko", // 한국어 주소 우선
      });

      if (result.results && result.results.length > 0) {
        // 🔥 한국어 주소 우선 선택
        let address = result.results[0].formatted_address;

        // 🔥 더 구체적인 주소 찾기 (건물명, 도로명 주소 우선)
        const preferredAddress = result.results.find(
          (r) =>
            r.types.includes("premise") || // 건물명
            r.types.includes("street_address") || // 도로명 주소
            r.types.includes("route") // 도로명
        );

        if (preferredAddress) {
          address = preferredAddress.formatted_address;
        }

        // 🔥 주소 정리 (한국어 주소 형식)
        // 예: "대한민국 서울특별시 노원구..." → "서울특별시 노원구..."
        address = address.replace(/^대한민국\s+/, "");

        setSelectedLocation({ lat, lng, name: address });
      } else {
        // 주소를 찾을 수 없으면 좌표 표시
        setSelectedLocation({
          lat,
          lng,
          name: `위치 (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
        });
      }
    } catch (error) {
      console.error("주소 변환 실패:", error);
      setSelectedLocation({
        lat,
        lng,
        name: `위치 (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 Google Maps API 로드
  useEffect(() => {
    const loadMaps = async () => {
      try {
        // 🔥 이미 로드되어 있으면 즉시 초기화
        if (isGoogleMapsLoaded()) {
          setMapsLoading(false);
          return;
        }
        
        // 🔥 Google Maps API 로드
        await loadGoogleMapsAPI();
        setMapsLoading(false);
      } catch (error) {
        console.error("❌ [MapPickerModal] Google Maps API 로드 실패:", error);
        setMapsError("지도를 불러올 수 없습니다. 페이지를 새로고침해주세요.");
        setMapsLoading(false);
      }
    };
    
    loadMaps();
  }, []);

  // 🔥 지도 초기화 (Google Maps API 로드 후)
  useEffect(() => {
    // 🔥 Google Maps API가 로드되지 않았으면 대기
    if (mapsLoading || !isGoogleMapsLoaded() || !mapContainerRef.current) {
      return;
    }
    
    // 🔥 window.google 확인 (안전 체크)
    if (!window.google || !window.google.maps) {
      console.error("❌ [MapPickerModal] window.google이 없습니다.");
      setMapsError("지도를 불러올 수 없습니다.");
      return;
    }

    try {
      // Google Maps 초기화
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: 37.5665, lng: 126.9780 }, // 서울시청 기본값
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapRef.current = map;

      // 🔥 지도 클릭 이벤트
      map.addListener("click", async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // 마커 표시
      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
      } else {
        markerRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });

        // 🔥 마커 드래그 시에도 주소 업데이트
        markerRef.current.addListener("dragend", async (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const draggedLat = e.latLng.lat();
          const draggedLng = e.latLng.lng();
          await reverseGeocode(draggedLat, draggedLng);
        });
      }

      // 🔥 좌표 → 주소 변환 (Reverse Geocoding)
      await reverseGeocode(lat, lng);
    });

      // 🔥 현재 위치 가져오기
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            map.setCenter(userLocation);
            map.setZoom(16);
          },
          () => {
            console.log("위치 권한 거부됨, 기본 위치 사용");
          }
        );
      }
    } catch (error) {
      console.error("❌ [MapPickerModal] 지도 초기화 실패:", error);
      setMapsError("지도를 초기화할 수 없습니다.");
    }
  }, [mapsLoading, reverseGeocode]);

  // 🔥 위치 선택 완료
  const handleConfirm = () => {
    if (!selectedLocation) {
      alert("지도에서 위치를 선택해주세요");
      return;
    }

    onSelect(selectedLocation.lat, selectedLocation.lng, selectedLocation.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">위치 선택</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 지도 영역 */}
        <div className="relative">
          {mapsLoading && (
            <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">지도 로딩 중...</p>
              </div>
            </div>
          )}
          {mapsError && (
            <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
              <div className="text-center p-4">
                <p className="text-sm text-red-600 mb-2">{mapsError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  페이지 새로고침
                </button>
              </div>
            </div>
          )}
          {!mapsLoading && !mapsError && (
            <div
              ref={mapContainerRef}
              className="w-full h-96 bg-gray-200"
              style={{ minHeight: "384px" }}
            />
          )}
          {loading && (
            <div className="absolute top-4 left-4 bg-white/90 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-700">주소 변환 중...</span>
            </div>
          )}
        </div>

        {/* 선택된 위치 정보 */}
        {selectedLocation && (
          <div className="p-4 bg-blue-50 border-t border-blue-100">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  선택한 위치
                </p>
                <p className="text-sm text-gray-700 break-words">
                  {selectedLocation.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  좌표: {selectedLocation.lat.toFixed(6)},{" "}
                  {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        {!selectedLocation && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <p className="text-sm text-gray-600 text-center">
              지도를 클릭하여 위치를 선택하세요
            </p>
          </div>
        )}

        {/* 버튼 */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation || loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>처리 중...</span>
              </>
            ) : (
              "이 위치 선택"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
