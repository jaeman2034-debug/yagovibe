import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

declare global {
  interface Window {
    google: any;
  }
}

export default function VoiceMapPageSimple() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Google Maps API 로드
    if (window.google && window.google.maps) {
      // 이미 로드됨
      setMapLoaded(true);
      if (mapRef.current) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7138, lng: 127.0474 },
          zoom: 13,
        });
        new window.google.maps.Marker({
          position: { lat: 37.7138, lng: 127.0474 },
          map,
        });
      }
      return;
    }

    // 스크립트 로드
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places,marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("✅ Google Maps API 로드 완료!");
      setMapLoaded(true);
      if (mapRef.current && window.google) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7138, lng: 127.0474 },
          zoom: 13,
        });
        new window.google.maps.Marker({
          position: { lat: 37.7138, lng: 127.0474 },
          map,
        });
      }
    };
    script.onerror = () => {
      console.error("❌ Google Maps API 로드 실패");
    };
    document.head.appendChild(script);

    return () => {
      // cleanup
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <h1 className="text-xl font-bold">📍 AI 음성 기반 Google 지도</h1>

      <div
        ref={mapRef}
        className="w-full md:w-[70%] max-w-[600px] aspect-square md:aspect-[4/3] border rounded-lg shadow"
      />

      <p className="text-gray-700 text-sm">
        {mapLoaded ? "Google Maps 로딩 완료 ✅" : "Google Maps 로딩 중..."}
      </p>

      <Link to="/" className="text-blue-600 underline hover:text-blue-800">
        🏠 홈으로 돌아가기
      </Link>
    </div>
  );
}

