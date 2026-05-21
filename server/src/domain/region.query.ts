/**
 * 🔥 Region Query - 지역 필터 헬퍼
 * 
 * Week7 핵심: 지역별 데이터 필터링 유틸리티
 */

/**
 * 지역별 필터링
 */
export function byRegion<T extends { region: string }>(
  list: T[],
  region: string
): T[] {
  return list.filter((item) => item.region === region);
}

/**
 * 지역별 그룹화
 */
export function groupByRegion<T extends { region: string }>(
  list: T[]
): Record<string, T[]> {
  return list.reduce((acc, item) => {
    if (!acc[item.region]) {
      acc[item.region] = [];
    }
    acc[item.region].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * 유효한 지역인지 확인
 */
export function isValidRegion(region: string): boolean {
  const validRegions = [
    "seoul",
    "busan",
    "daegu",
    "incheon",
    "gwangju",
    "daejeon",
    "ulsan",
    "gyeonggi",
    "gangwon",
    "jeju",
  ];
  return validRegions.includes(region);
}

/**
 * 지역 이름 매핑
 */
export const REGION_NAMES: Record<string, string> = {
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
 * 지역 이름 가져오기
 */
export function getRegionName(region: string): string {
  return REGION_NAMES[region] || region;
}
