/**
 * 🔥 Google Geocoding API 응답에서 행정동 추출 유틸
 * 
 * address_components에서 행정구역을 우선순위대로 추출
 */

export interface AddressComponents {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface ParsedAddress {
  region1: string | null; // 시/도 (예: "서울특별시")
  region2: string | null; // 시/군/구 (예: "노원구")
  region3: string | null; // 동/읍/면 (예: "상계동")
  locationText: string | null; // 전체 주소 (예: "서울특별시 노원구 상계동")
  addressShort: string | null; // 짧은 주소 (예: "상계동")
}

/**
 * Google Geocoding API의 address_components에서 행정동 추출
 * 
 * 우선순위:
 * 1. sublocality_level_2 (가장 세밀한 행정동)
 * 2. sublocality (일반 동)
 * 3. administrative_area_level_3 (시/군/구 하위 행정구역)
 * 
 * @param components Google Geocoding API의 address_components 배열
 * @returns 파싱된 주소 정보
 */
export function parseAddressComponents(
  components: AddressComponents[]
): ParsedAddress {
  const result: ParsedAddress = {
    region1: null,
    region2: null,
    region3: null,
    locationText: null,
    addressShort: null,
  };

  // region1 (시/도) 추출
  const region1Component = components.find((c) =>
    c.types.includes("administrative_area_level_1")
  );
  if (region1Component) {
    result.region1 = region1Component.long_name;
  }

  // region2 (시/군/구) 추출
  const region2Component = components.find((c) =>
    c.types.includes("administrative_area_level_2") ||
    c.types.includes("sublocality_level_1")
  );
  if (region2Component) {
    result.region2 = region2Component.long_name;
  }

  // region3 (동/읍/면) 추출 - 우선순위대로 시도
  let region3Component: AddressComponents | undefined;

  // 1순위: sublocality_level_2 (가장 세밀한 행정동)
  region3Component = components.find((c) =>
    c.types.includes("sublocality_level_2")
  );

  // 2순위: sublocality (일반 동)
  if (!region3Component) {
    region3Component = components.find((c) =>
      c.types.includes("sublocality")
    );
  }

  // 3순위: administrative_area_level_3
  if (!region3Component) {
    region3Component = components.find((c) =>
      c.types.includes("administrative_area_level_3")
    );
  }

  // 4순위: neighborhood (동네)
  if (!region3Component) {
    region3Component = components.find((c) =>
      c.types.includes("neighborhood")
    );
  }

  if (region3Component) {
    result.region3 = region3Component.long_name;
    result.addressShort = region3Component.long_name;
  }

  // locationText 생성 (전체 주소)
  const parts: string[] = [];
  if (result.region1) parts.push(result.region1);
  if (result.region2) parts.push(result.region2);
  if (result.region3) parts.push(result.region3);

  if (parts.length > 0) {
    result.locationText = parts.join(" ");
  }

  return result;
}

