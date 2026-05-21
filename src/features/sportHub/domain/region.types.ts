/**
 * 🔥 Region Types - 지역 멀티 허브 모델
 * 
 * 전국 확장 아키텍처
 */

/**
 * 지역 타입
 */
export type Region =
  | "seoul"      // 서울
  | "busan"      // 부산
  | "daegu"      // 대구
  | "incheon"    // 인천
  | "gwangju"   // 광주
  | "daejeon"    // 대전
  | "ulsan"      // 울산
  | "gyeonggi"   // 경기
  | "gangwon"    // 강원
  | "jeju";      // 제주

/**
 * 지역 라벨 매핑
 */
export const REGION_LABELS: Record<Region, string> = {
  seoul: "서울",
  busan: "부산",
  daegu: "대구",
  incheon: "인천",
  gwangju: "광주",
  daejeon: "대전",
  ulsan: "울산",
  gyeonggi: "경기",
  gangwon: "강원",
  jeju: "제주",
};

/**
 * 지역 정보
 */
export type RegionInfo = {
  code: Region;
  name: string;
  isActive: boolean;
};

/**
 * 기본 지역 (현재 위치 기반 또는 설정)
 */
export function getDefaultRegion(): Region {
  // TODO: GPS 또는 사용자 설정 기반
  return "seoul";
}

/**
 * 지역 코드 검증
 */
export function isValidRegion(code: string): code is Region {
  return Object.keys(REGION_LABELS).includes(code);
}
