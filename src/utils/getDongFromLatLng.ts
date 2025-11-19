// src/utils/getDongFromLatLng.ts

export async function getDongFromLatLng(lat: number, lng: number): Promise<string | null> {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn("Google Maps API key(VITE_GOOGLE_MAPS_API_KEY)가 없습니다.");
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ko&key=${apiKey}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("Google reverse geocoding 실패:", res.status);
      return null;
    }

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const components = data.results[0].address_components;

    if (!components || components.length === 0) {
      return null;
    }

    // 우선순위: administrative_area_level_3 → sublocality_level_2 → sublocality_level_1
    const dong =
      components.find((c) => c.types.includes("administrative_area_level_3"))?.long_name ||
      components.find((c) => c.types.includes("sublocality_level_2"))?.long_name ||
      components.find((c) => c.types.includes("sublocality_level_1"))?.long_name ||
      null;

    return dong;
  } catch (e) {
    console.error("getDongFromLatLng 에러:", e);
    return null;
  }
}





