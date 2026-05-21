/**
 * 경기장(Venue) 타입 정의
 * 노원구청장기 축구대회 기준 경기장 마스터
 */

export type VenueId = "MADEUL" | "YUKSA" | "SURAK" | "CHOAN" | "BURAM";

export interface Venue {
  id: VenueId;
  name: string; // 전체 명칭 (예: "마들스타디움")
  shortName: string; // 짧은 표기 (예: "마들")
  location?: string; // 위치 정보
  address?: string; // 주소
  capacity?: number; // 수용 인원
  facilities?: string[]; // 시설 정보
}

/**
 * 노원구청장기 축구대회 경기장 마스터 데이터
 */
export const NOWON_VENUES: Venue[] = [
  { id: "MADEUL", name: "마들스타디움", shortName: "마들" },
  { id: "YUKSA", name: "육군사관학교 축구장", shortName: "육사" },
  { id: "SURAK", name: "수락산 축구장", shortName: "수락산" },
  { id: "CHOAN", name: "초안산 축구장", shortName: "초안산" },
  { id: "BURAM", name: "불암산 축구장", shortName: "불암산" },
];

/**
 * VenueId로 Venue 찾기
 */
export function getVenueById(id: VenueId): Venue | undefined {
  return NOWON_VENUES.find((v) => v.id === id);
}

/**
 * shortName으로 Venue 찾기
 */
export function getVenueByShortName(shortName: string): Venue | undefined {
  return NOWON_VENUES.find((v) => v.shortName === shortName);
}

