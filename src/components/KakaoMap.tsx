import React, { useEffect, useRef } from "react";

// ✅ Kakao SDK 로드 함수
function loadKakaoSDK() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.kakao && window.kakao.maps) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_JS_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("Kakao Maps SDK 로드 실패"));
    document.head.appendChild(script);
  });
}

// ✅ 이 줄이 제일 중요! 맨 위에 있어야 함
export type Place = {
  id: string;
  name: string;
  address: string;
  roadAddress?: string;
  lat: number;
  lng: number;
  phone?: string;
  url?: string;
};

type Props = {
  center?: { lat: number; lng: number };
  level?: number;
  places: Place[];
  onMarkerClick?: (place: Place) => void;
  height?: string;
};

// ✅ Kakao SDK 로드 코드 임시 비활성화 (Google Maps로 교체)
/*
let kakaoLoaderPromise: Promise<void> | null = null;
function loadKakaoSDK() {
  if (window.kakao && window.kakao.maps) {
    console.log("✅ Kakao SDK already loaded.");
    return Promise.resolve();
  }

  if (kakaoLoaderPromise) return kakaoLoaderPromise;

  kakaoLoaderPromise = new Promise<void>((resolve, reject) => {
    const appKey = import.meta.env.VITE_KAKAO_JS_KEY;
    if (!appKey) {
      reject(new Error("❌ Kakao API Key not found (VITE_KAKAO_JS_KEY)."));
      return;
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.async = true;

    script.onload = () => {
      console.log("✅ Kakao SDK script loaded. Initializing...");
      window.kakao.maps.load(() => {
        console.log("✅ Kakao SDK fully initialized!");
        resolve();
      });
    };

    script.onerror = (err) => {
      console.error("❌ Kakao SDK 로드 실패:", err);
      console.log("🔗 요청 URL:", script.src);
      reject(new Error("Kakao SDK 로드 실패"));
    };

    document.head.appendChild(script);
  });

  return kakaoLoaderPromise;
}
*/

const KakaoMap: React.FC<Props> = ({
  center = { lat: 37.5665, lng: 126.9780 },
  level = 5,
  places,
  onMarkerClick,
  height = "420px",
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    let destroyed = false;

    loadKakaoSDK()
      .then(() => {
        if (destroyed || !mapRef.current) return;
        const centerLatLng = new window.kakao.maps.LatLng(center.lat, center.lng);
        mapObj.current = new window.kakao.maps.Map(mapRef.current, {
          center: centerLatLng,
          level,
        });
        infoWindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 2 });
      })
      .catch(console.error);

    return () => {
      destroyed = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      infoWindowRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!window.kakao || !mapObj.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.kakao.maps.LatLngBounds();

    places.forEach((p) => {
      const pos = new window.kakao.maps.LatLng(p.lat, p.lng);
      bounds.extend(pos);
      const marker = new window.kakao.maps.Marker({ position: pos });
      marker.setMap(mapObj.current);

      window.kakao.maps.event.addListener(marker, "click", () => {
        const content = `
          <div style="padding:8px;line-height:1.4">
            <b>${p.name}</b><br/>
            <span>${p.roadAddress || p.address}</span><br/>
            ${p.phone ? `<span>${p.phone}</span><br/>` : ""}
            ${p.url ? `<a href="${p.url}" target="_blank" rel="noreferrer">상세보기</a>` : ""}
          </div>`;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapObj.current, marker);
        onMarkerClick?.(p);
      });

      markersRef.current.push(marker);
    });

    if (places.length > 0) {
      mapObj.current.setBounds(bounds);
    }
  }, [places]);

  return <div className="w-full rounded-2xl shadow border" style={{ height }} ref={mapRef} />;
};

export default KakaoMap;
