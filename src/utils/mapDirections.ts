import type { MarketProduct } from "@/types/market";

export function productLatLngForDirections(p: MarketProduct): { lat: number; lng: number } | null {
  const latRaw = p.latitude ?? (p as { lat?: unknown }).lat;
  const lngRaw = p.longitude ?? (p as { lng?: unknown }).lng;
  const lat = typeof latRaw === "string" ? Number(latRaw.replace(/[^\d.-]/g, "")) : Number(latRaw);
  const lng = typeof lngRaw === "string" ? Number(lngRaw.replace(/[^\d.-]/g, "")) : Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * 외부 지도 길찾기(웹/PWA). 구글은 출발지 옵션, 카카오·네이버는 목적지 웹 링크.
 */
export function openGoogleDirectionsTo(
  dest: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null
): void {
  let url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
    url += `&origin=${origin.lat},${origin.lng}`;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** 카카오맵 웹 — 목적지 링크 (좌표 기준) */
export function openKakaoDirectionsTo(
  dest: { lat: number; lng: number },
  placeName?: string | null
): void {
  const label = (placeName && placeName.trim()) || "목적지";
  const url = `https://map.kakao.com/link/to/${encodeURIComponent(label)},${dest.lat},${dest.lng}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** 네이버 지도 웹 — 길찾기(출발 미지정 시 현재 위치 기준 앱/웹 동작) */
export function openNaverDirectionsTo(
  dest: { lat: number; lng: number },
  placeName?: string | null
): void {
  const label = (placeName && placeName.trim()) || "목적지";
  const url = `https://map.naver.com/v5/directions/-/${dest.lat},${dest.lng},${encodeURIComponent(label)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
