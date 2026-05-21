/**
 * 🔥 Association Adapter - 협회 데이터 → Story 변환
 * 
 * 협회 원본 데이터를 Story 형식으로 정규화
 */

import type { Story } from "./story.types";
import type { Region } from "./region.types";
import type { AssocLeague, AssocNotice, AssocRecruitment } from "./assoc.types";
import { DEFAULT_EXPIRATION_DAYS } from "./story.expiration.policy";

/**
 * 날짜에 일수 추가
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * 대회 → Story 변환 (지역 매핑)
 */
export function leagueToStory(league: AssocLeague, region: Region): Story {
  const now = new Date().toISOString();
  
  return {
    id: `assoc-league-${league.id}`,
    region, // 지역 매핑
    source: "협회",
    category: "대회",
    
    title: `${league.region} ${league.name}`.slice(0, 40),
    subtitle: `${league.startDate.slice(0, 10)} ~ ${league.endDate.slice(0, 10)}`,
    
    status: "PUBLISHED",
    
    startAt: league.startDate,
    endAt: league.endDate,
    
    priority: 90, // 협회 대회는 높은 우선순위
    
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 공지 → Story 변환 (지역 매핑)
 */
export function noticeToStory(notice: AssocNotice, region: Region): Story {
  const now = new Date().toISOString();
  
  return {
    id: `assoc-notice-${notice.id}`,
    region, // 지역 매핑
    source: "협회",
    category: "협회",
    
    title: notice.title.slice(0, 40),
    subtitle: notice.content.slice(0, 60),
    
    status: "PUBLISHED",
    
    startAt: notice.publishedAt,
    endAt: addDays(notice.publishedAt, DEFAULT_EXPIRATION_DAYS),
    
    priority: 85, // 협회 공지
    
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 모집 → Story 변환 (지역 매핑)
 */
export function recruitmentToStory(recruitment: AssocRecruitment, region: Region): Story {
  const now = new Date().toISOString();
  
  return {
    id: `assoc-recruitment-${recruitment.id}`,
    region, // 지역 매핑
    source: "협회",
    category: "모집",
    
    title: recruitment.title.slice(0, 40),
    subtitle: recruitment.description.slice(0, 60),
    
    status: "PUBLISHED",
    
    startAt: now,
    endAt: recruitment.deadline,
    
    priority: 80, // 협회 모집
    
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 협회 데이터 일괄 변환 (지역별)
 */
export function convertAssocToStories(
  leagues: AssocLeague[],
  notices: AssocNotice[],
  recruitments: AssocRecruitment[],
  regionMap: (item: AssocLeague | AssocNotice | AssocRecruitment) => Region
): Story[] {
  const stories: Story[] = [];
  
  stories.push(...leagues.map((l) => leagueToStory(l, regionMap(l))));
  stories.push(...notices.map((n) => noticeToStory(n, regionMap(n))));
  stories.push(...recruitments.map((r) => recruitmentToStory(r, regionMap(r))));
  
  return stories;
}
