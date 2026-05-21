// src/utils/getAddressFromLatLng.ts
// 역지오코딩: 마켓/허브/활동 등 공통 — Google Geocoding API만 사용 (지도 타일과 동일 스택, Kakao REST 제거)

export interface AddressResult {
  si?: string | null;
  gu?: string | null;
  dong?: string | null;
  short?: string | null;
}

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeocodeResponse {
  results?: Array<{ address_components?: GoogleAddressComponent[] }>;
  status?: string;
  error_message?: string;
}

const THROTTLE_MS = 1200;
let lastCallAt = 0;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Address lookup timeout")), timeoutMs);
    }),
  ]);
}

function pickComponent(
  components: GoogleAddressComponent[],
  ...types: string[]
): string | null {
  for (const t of types) {
    const c = components.find((x) => x.types.includes(t));
    if (c?.long_name?.trim()) return c.long_name.trim();
  }
  return null;
}

/**
 * Google Geocode `address_components` → 시·구·동 (한국 위주, 타 지역 best-effort).
 * 동이 없으면 neighborhood → route 순으로 보조(도로명/읍면 단위 표시).
 */
/**
 * HTTP Geocoding이 REQUEST_DENIED(주로 referrer 제한 키)일 때,
 * 동일 키로 로드되는 Maps JavaScript Geocoder로 폴백한다.
 */
async function reverseGeocodeViaMapsJs(lat: number, lng: number): Promise<AddressResult | null> {
  if (typeof window === "undefined") return null;
  try {
    const { loadGoogleMapsAPI } = await import("@/utils/googleMapsLoader");
    await loadGoogleMapsAPI();
    const maps = window.google?.maps as typeof google.maps | undefined;
    if (!maps?.Geocoder) return null;
    const geocoder = new maps.Geocoder();
    return await new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng }, language: "ko" }, (results, status) => {
        if (status !== "OK" || !results?.[0]?.address_components?.length) {
          resolve(null);
          return;
        }
        resolve(parseGoogleComponents(results[0].address_components as GoogleAddressComponent[]));
      });
    });
  } catch {
    return null;
  }
}

function parseGoogleComponents(components: GoogleAddressComponent[]): AddressResult | null {
  if (!components?.length) return null;

  const si = pickComponent(components, "administrative_area_level_1");
  // 구(시군구): 동 레벨(sublocality_level_1)은 넣지 않음 — 없으면 locality만 사용
  const gu = pickComponent(components, "administrative_area_level_2", "locality");
  const dong = pickComponent(
    components,
    "administrative_area_level_3",
    "sublocality_level_2",
    "sublocality_level_1",
    "sublocality",
    "neighborhood",
    "sublocality_level_3",
    "sublocality_level_4",
    "route"
  );

  const short =
    [gu, dong].filter(Boolean).join(" ").trim() ||
    si ||
    null;

  if (!si && !gu && !dong) return null;

  return {
    si: si ?? null,
    gu: gu ?? null,
    dong: dong ?? null,
    short: short || null,
  };
}

/**
 * 좌표를 행정구역 구조로 변환한다. (Google Geocoding — `getDongFromLatLng`와 동일 키)
 */
export async function getAddressFromLatLngDetailed(
  lat: number,
  lng: number
): Promise<AddressResult | null> {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Google Maps API key(VITE_GOOGLE_MAPS_API_KEY)가 없습니다. 역지오코딩 생략.");
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ko&key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn("Google reverse geocoding HTTP 실패:", res.status);
      return null;
    }

    const data = (await res.json()) as GoogleGeocodeResponse;

    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      const msg = data.error_message || "";
      if (
        data.status === "REQUEST_DENIED" ||
        msg.toLowerCase().includes("referer")
      ) {
        const viaJs = await reverseGeocodeViaMapsJs(lat, lng);
        if (viaJs) return viaJs;
      }
      console.warn("Google reverse geocoding 실패:", data.status, msg);
      return null;
    }

    const components = data.results?.[0]?.address_components;
    if (!components?.length) return null;

    return parseGoogleComponents(components);
  } catch (e) {
    console.error("getAddressFromLatLngDetailed 에러:", e);
    return null;
  }
}

/**
 * 허브에서 사용하는 스로틀 버전 주소 변환.
 * - 과도한 외부 API 호출 방지
 * - timeout 초과 시 null 반환
 */
export async function getAddressFromLatLngThrottled(
  lat: number,
  lng: number,
  timeoutMs: number = 5000
): Promise<AddressResult | null> {
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < THROTTLE_MS) {
    await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS - elapsed));
  }
  lastCallAt = Date.now();

  try {
    return await withTimeout(getAddressFromLatLngDetailed(lat, lng), timeoutMs);
  } catch (e) {
    console.warn("getAddressFromLatLngThrottled 실패:", e);
    return null;
  }
}

/**
 * 하위 호환: "구 동" 형태 문자열 반환.
 */
export async function getAddressFromLatLng(lat: number, lng: number): Promise<string | null> {
  const detailed = await getAddressFromLatLngDetailed(lat, lng);
  return detailed?.short ?? null;
}
