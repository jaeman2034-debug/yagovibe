// src/utils/getAddressFromLatLng.ts
export async function getAddressFromLatLng(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const apiKey = import.meta.env.VITE_KAKAO_REST_API_KEY;
    if (!apiKey) {
      console.warn("Kakao REST API key(VITE_KAKAO_REST_API_KEY)가 없습니다.");
      return null;
    }

    const url =
      `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });

    if (!res.ok) {
      console.warn("Kakao reverse geocoding 실패:", res.status);
      return null;
    }

    const data = await res.json();

    if (!data.documents || data.documents.length === 0) return null;

    const region = data.documents[0];
    // 예: "송파구 잠실동"
    return `${region.region_2depth_name} ${region.region_3depth_name}`;
  } catch (e) {
    console.error("getAddressFromLatLng 에러:", e);
    return null;
  }
}

