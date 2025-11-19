// src/utils/geo/kakaoReverse.ts

export async function getDongFromCoords(lat: number, lng: number) {
  try {
    const key = import.meta.env.VITE_KAKAO_JS_KEY;
    const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${key}`,
      },
    });

    const data = await response.json();

    if (!data.documents?.length) return "위치 정보 없음";

    const addr = data.documents[0].address || data.documents[0].road_address;
    if (!addr) return "위치 정보 없음";

    return addr.region_3depth_name; // "송도동", "수동", "연수동" 등
  } catch (e) {
    console.error("Reverse Error:", e);
    return "위치 정보 없음";
  }
}

// 호환성을 위한 별칭 (기존 코드 유지)
export async function getAddressFromCoords(lat: number, lng: number) {
  const dong = await getDongFromCoords(lat, lng);
  return { dong, full: null };
}

