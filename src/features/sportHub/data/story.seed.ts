/**
 * 🔥 Story Seed - 초기 공백 방지 더미
 */

import type { Story } from "../domain/story.types";
import type { Region } from "../domain/region.types";
import { DEFAULT_EXPIRATION_DAYS } from "../domain/story.expiration.policy";

// 기본 기간 계산 헬퍼
const getDefaultSchedule = () => {
  const now = new Date();
  const end = new Date(now.getTime() + DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
  return {
    startAt: now.toISOString(),
    endAt: end.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};

/**
 * Seed 스토리 생성 (지역별)
 */
export function createSeedStories(region: Region = "seoul"): Story[] {
  return [
    // 운영(C) - 기본 2개 확보
    {
      id: `ops-1-${region}`,
      region,
      source: "운영",
      category: "대회",
      title: "이번 주 대회 일정",
      subtitle: "지역 리그 경기 시간표를 확인하세요",
      status: "PUBLISHED",
      priority: 90,
      ...getDefaultSchedule(),
    },
    {
      id: `ops-2-${region}`,
      region,
      source: "운영",
      category: "모집",
      title: "우리 동네 팀 모집",
      subtitle: "주 1회 · 초보 환영",
      status: "PUBLISHED",
      priority: 80,
      ...getDefaultSchedule(),
    },

    // 협회(B)
    {
      id: `fa-1-${region}`,
      region,
      source: "협회",
      category: "협회",
      title: "협회 공지: 참가 신청 마감 임박",
      subtitle: "이번 주 금요일 18:00까지",
      status: "PUBLISHED",
      priority: 95,
      ...getDefaultSchedule(),
    },

    // 사용자(A) - 검증/인기 기반만
    {
      id: `ugc-1-${region}`,
      region,
      source: "사용자",
      category: "마켓",
      title: "나이키 티엠포 270 팝니다",
      subtitle: "상태 A급 · 직거래 가능",
      status: "PUBLISHED",
      score: 72,
      isVerifiedAuthor: true,
      ...getDefaultSchedule(),
    },
    {
      id: `ugc-2-${region}`,
      region,
      source: "사용자",
      category: "구장",
      title: "주말 저녁 구장 한자리 남아요",
      subtitle: "8vs8 · 2시간 · 주차 가능",
      status: "PUBLISHED",
      score: 40, // 낮아서 엔진에서 걸러질 수 있음
      isVerifiedAuthor: false,
      ...getDefaultSchedule(),
    },
  ];
}

// 기본 seed (하위 호환성)
export const seedStories: Story[] = createSeedStories("seoul");
