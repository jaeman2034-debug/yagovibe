/**
 * 🔥 Seed Stories - 시드 스토리 데이터
 * 
 * Week8 핵심: DB 장애 시 폴백용 시드 데이터
 */

import type { Story } from "../domain/types";

/**
 * 지역별 시드 스토리 생성
 */
export function createSeedStories(region: string): Story[] {
  const regionName = region === "seoul" ? "서울" : region;

  return [
    {
      id: `seed_${region}_1`,
      region,
      source: "운영",
      category: "대회",
      title: `${regionName} 지역 축구 대회`,
      subtitle: "이번 주 경기 일정을 확인하세요",
      status: "PUBLISHED",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ctaType: "view_schedule",
      priority: 80,
      score: 0,
      isVerifiedAuthor: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `seed_${region}_2`,
      region,
      source: "운영",
      category: "모집",
      title: `${regionName} 지역 팀 모집`,
      subtitle: "새로운 팀원을 찾고 있어요",
      status: "PUBLISHED",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ctaType: "find_team",
      priority: 70,
      score: 0,
      isVerifiedAuthor: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `seed_${region}_3`,
      region,
      source: "운영",
      category: "구장",
      title: `${regionName} 지역 구장 예약`,
      subtitle: "주말 경기장을 예약하세요",
      status: "PUBLISHED",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ctaType: "book_ground",
      priority: 60,
      score: 0,
      isVerifiedAuthor: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
