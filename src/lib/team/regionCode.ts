/**
 * 🔥 Region Code - 지역 코드 유틸리티
 *
 * ========================================
 * 📍 Region Code 목적
 * ========================================
 *
 * region 필드 (한글):
 * - "서울시 노원구"
 * - "경기도 수원시"
 * - "부산광역시 해운대구"
 *
 * regionCode 필드 (기계 최적화):
 * - "SEOUL_NOWON"
 * - "GYEONGGI_SUWON"
 * - "BUSAN_HAEUNDAE"
 *
 * 용도:
 * - 검색 성능 향상
 * - 매칭 알고리즘 최적화
 * - 리그/토너먼트 필터링
 *
 * ========================================
 * 🎯 사용 원칙
 * ========================================
 *
 * - region: 사용자에게 표시 (한글)
 * - regionCode: 내부 로직/쿼리용 (영문 코드)
 * - 둘 다 저장 (호환성 유지)
 */

/**
 * 지역 코드 타입
 * 
 * 형식: {시도}_{시군구}
 * 예: SEOUL_NOWON, GYEONGGI_SUWON, BUSAN_HAEUNDAE
 */
export type RegionCode = string;

/**
 * 지역명 → 지역 코드 매핑
 * 
 * 주요 지역 매핑 (확장 가능)
 */
const REGION_CODE_MAP: Record<string, RegionCode> = {
  // 서울
  "서울시 노원구": "SEOUL_NOWON",
  "서울 노원구": "SEOUL_NOWON",
  "노원구": "SEOUL_NOWON",
  "서울시 강남구": "SEOUL_GANGNAM",
  "서울 강남구": "SEOUL_GANGNAM",
  "강남구": "SEOUL_GANGNAM",
  "서울시 강동구": "SEOUL_GANGDONG",
  "서울 강동구": "SEOUL_GANGDONG",
  "강동구": "SEOUL_GANGDONG",
  "서울시 송파구": "SEOUL_SONGPA",
  "서울 송파구": "SEOUL_SONGPA",
  "송파구": "SEOUL_SONGPA",
  
  // 경기
  "경기도 수원시": "GYEONGGI_SUWON",
  "경기 수원시": "GYEONGGI_SUWON",
  "수원시": "GYEONGGI_SUWON",
  "경기도 성남시": "GYEONGGI_SEONGNAM",
  "경기 성남시": "GYEONGGI_SEONGNAM",
  "성남시": "GYEONGGI_SEONGNAM",
  
  // 부산
  "부산광역시 해운대구": "BUSAN_HAEUNDAE",
  "부산 해운대구": "BUSAN_HAEUNDAE",
  "해운대구": "BUSAN_HAEUNDAE",
  
  // 기본값 (매핑 없을 때)
  "서울": "SEOUL",
  "경기": "GYEONGGI",
  "부산": "BUSAN",
  "인천": "INCHEON",
  "대구": "DAEGU",
  "광주": "GWANGJU",
  "대전": "DAEJEON",
  "울산": "ULSAN",
  "강원": "GANGWON",
  "제주": "JEJU",
};

/**
 * 지역명을 지역 코드로 변환
 * 
 * @param region - 한글 지역명 (예: "서울시 노원구")
 * @returns 지역 코드 (예: "SEOUL_NOWON")
 * 
 * @example
 * ```ts
 * getRegionCode("서울시 노원구") // "SEOUL_NOWON"
 * getRegionCode("경기도 수원시") // "GYEONGGI_SUWON"
 * ```
 */
export function getRegionCode(region: string): RegionCode {
  if (!region) {
    return "UNKNOWN";
  }

  // 정확한 매칭 시도
  const trimmedRegion = region.trim();
  if (REGION_CODE_MAP[trimmedRegion]) {
    return REGION_CODE_MAP[trimmedRegion];
  }

  // 부분 매칭 시도 (예: "노원구" → "SEOUL_NOWON")
  for (const [key, code] of Object.entries(REGION_CODE_MAP)) {
    if (trimmedRegion.includes(key) || key.includes(trimmedRegion)) {
      return code;
    }
  }

  // 기본값: 지역명을 대문자로 변환하고 공백을 언더스코어로
  const normalized = trimmedRegion
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
  
  return normalized || "UNKNOWN";
}

/**
 * 지역 코드를 지역명으로 변환 (역변환)
 * 
 * @param regionCode - 지역 코드 (예: "SEOUL_NOWON")
 * @returns 한글 지역명 (예: "서울시 노원구")
 * 
 * @example
 * ```ts
 * getRegionFromCode("SEOUL_NOWON") // "서울시 노원구"
 * ```
 */
export function getRegionFromCode(regionCode: RegionCode): string {
  // 역매핑 생성
  const reverseMap: Record<string, string> = {};
  for (const [key, code] of Object.entries(REGION_CODE_MAP)) {
    if (!reverseMap[code] || key.length > reverseMap[code].length) {
      reverseMap[code] = key; // 가장 긴 이름 선택
    }
  }

  return reverseMap[regionCode] || regionCode.replace(/_/g, " ");
}

/**
 * 지역 코드 검증
 * 
 * @param regionCode - 검증할 지역 코드
 * @returns 유효한 지역 코드인지 여부
 */
export function isValidRegionCode(regionCode: string): boolean {
  // 기본 형식 검증: 대문자, 언더스코어, 숫자만 허용
  return /^[A-Z0-9_]+$/.test(regionCode);
}
