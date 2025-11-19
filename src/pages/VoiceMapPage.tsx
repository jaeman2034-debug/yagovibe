import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

declare global {
  interface Window {
    google: any;
  }
}

export default function VoiceMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current && window.google) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.7138, lng: 127.0474 },
        zoom: 13,
      });
      new window.google.maps.Marker({ position: { lat: 37.7138, lng: 127.0474 }, map });
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <h1 className="text-xl font-bold">📍 AI 음성 기반 Google 지도</h1>

      <div
        ref={mapRef}
        className="w-full md:w-[70%] max-w-[600px] aspect-square md:aspect-[4/3] border rounded-lg shadow"
      />

      <p className="text-gray-700 text-sm">Google Maps 로딩 완료 ✅</p>

      <Link to="/" className="text-blue-600 underline hover:text-blue-800">
        🏠 홈으로 돌아가기
      </Link>
    </div>
  );
}
