/**
 * 🔥 Sync Assoc Job - 협회 데이터 동기화 배치
 * 
 * Week2 핵심: 협회 API → Story 자동 생성
 */

import { prisma } from "../data/prisma";
import {
  leagueToStory,
  noticeToStory,
  recruitmentToStory,
  type AssocLeagueApi,
  type AssocNoticeApi,
  type AssocRecruitmentApi,
} from "../domain/assoc.adapter";
import type { LeagueInfo } from "../domain/types";

/**
 * 실제 협회 API 호출 (스텁)
 * 
 * 실제 구현: 외부 협회 API 엔드포인트 호출
 */
async function fetchAssocLeagues(region: string): Promise<AssocLeagueApi[]> {
  // 실제 구현 예시:
  // const res = await fetch(`${ASSOC_API_BASE}/leagues?region=${region}`);
  // return await res.json();

  // 스텁 데이터
  return [
    {
      id: `league-${Date.now()}`,
      region: "seoul",
      name: "서울 주말 리그",
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      description: "서울 지역 주말 축구 리그",
    },
  ];
}

async function fetchAssocNotices(region: string): Promise<AssocNoticeApi[]> {
  // 실제 구현 예시:
  // const res = await fetch(`${ASSOC_API_BASE}/notices?region=${region}`);
  // return await res.json();

  // 스텁 데이터
  return [
    {
      id: `notice-${Date.now()}`,
      region: "seoul",
      title: "협회 공지: 참가 신청 마감 임박",
      content: "이번 주 금요일 18:00까지 신청 가능합니다",
      publishedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

async function fetchAssocRecruitments(region: string): Promise<AssocRecruitmentApi[]> {
  // 실제 구현 예시:
  // const res = await fetch(`${ASSOC_API_BASE}/recruitments?region=${region}`);
  // return await res.json();

  // 스텁 데이터
  return [];
}

/**
 * 협회 리그 → League 테이블 동기화
 */
async function syncLeagues(region: string): Promise<number> {
  const leagues = await fetchAssocLeagues(region);
  let count = 0;

  for (const l of leagues) {
    const leagueData: LeagueInfo = {
      id: `assoc-${l.id}`,
      region: l.region as any,
      name: l.name,
      startAt: new Date(l.startDate).toISOString(),
      endAt: new Date(l.endDate).toISOString(),
    };

    await prisma.league.upsert({
      where: { id: leagueData.id },
      update: {
        name: leagueData.name,
        startAt: new Date(leagueData.startAt),
        endAt: new Date(leagueData.endAt),
      },
      create: {
        id: leagueData.id,
        region: leagueData.region,
        name: leagueData.name,
        startAt: new Date(leagueData.startAt),
        endAt: new Date(leagueData.endAt),
      },
    });

    count++;
  }

  return count;
}

/**
 * 협회 데이터 → Story 동기화
 */
async function syncStories(region: string): Promise<number> {
  const [leagues, notices, recruitments] = await Promise.all([
    fetchAssocLeagues(region),
    fetchAssocNotices(region),
    fetchAssocRecruitments(region),
  ]);

  let count = 0;

  // 리그 → Story
  for (const l of leagues) {
    const story = leagueToStory(l);

    await prisma.story.upsert({
      where: { id: story.id },
      update: {
        title: story.title,
        subtitle: story.subtitle,
        startAt: new Date(story.startAt),
        endAt: new Date(story.endAt),
        updatedAt: new Date(),
      },
      create: {
        id: story.id,
        region: story.region,
        source: story.source,
        category: story.category,
        title: story.title,
        subtitle: story.subtitle,
        status: story.status,
        startAt: new Date(story.startAt),
        endAt: new Date(story.endAt),
        ctaType: story.ctaType,
        priority: story.priority ?? 0,
        score: story.score ?? 0,
        isVerifiedAuthor: story.isVerifiedAuthor ?? false,
      },
    });

    count++;
  }

  // 공지 → Story
  for (const n of notices) {
    const story = noticeToStory(n);

    await prisma.story.upsert({
      where: { id: story.id },
      update: {
        title: story.title,
        subtitle: story.subtitle,
        startAt: new Date(story.startAt),
        endAt: new Date(story.endAt),
        updatedAt: new Date(),
      },
      create: {
        id: story.id,
        region: story.region,
        source: story.source,
        category: story.category,
        title: story.title,
        subtitle: story.subtitle,
        status: story.status,
        startAt: new Date(story.startAt),
        endAt: new Date(story.endAt),
        ctaType: story.ctaType,
        priority: story.priority ?? 0,
        score: story.score ?? 0,
        isVerifiedAuthor: story.isVerifiedAuthor ?? false,
      },
    });

    count++;
  }

  // 모집 → Story
  for (const r of recruitments) {
    const story = recruitmentToStory(r);

    await prisma.story.upsert({
      where: { id: story.id },
      update: {
        title: story.title,
        subtitle: story.subtitle,
        startAt: new Date(story.startAt),
        endAt: new Date(story.endAt),
        updatedAt: new Date(),
      },
      create: {
        id: story.id,
        region: story.region,
        source: story.source,
        category: story.category,
        title: story.title,
        subtitle: story.subtitle,
        status: story.status,
        startAt: new Date(story.startAt),
        endAt: new Date(story.endAt),
        ctaType: story.ctaType,
        priority: story.priority ?? 0,
        score: story.score ?? 0,
        isVerifiedAuthor: story.isVerifiedAuthor ?? false,
      },
    });

    count++;
  }

  return count;
}

/**
 * 협회 동기화 메인 함수
 */
export async function syncAssoc(region?: string): Promise<{
  leagues: number;
  stories: number;
  region: string;
}> {
  const targetRegion = region || "seoul";

  try {
    const [leagueCount, storyCount] = await Promise.all([
      syncLeagues(targetRegion),
      syncStories(targetRegion),
    ]);

    console.log(
      `[SYNC_ASSOC] ${targetRegion}: ${leagueCount} leagues, ${storyCount} stories synced`
    );

    return {
      leagues: leagueCount,
      stories: storyCount,
      region: targetRegion,
    };
  } catch (error) {
    console.error(`[SYNC_ASSOC] Error syncing ${targetRegion}:`, error);
    throw error;
  }
}

/**
 * 모든 지역 동기화
 */
export async function syncAllRegions(): Promise<void> {
  const regions = [
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

  const results = await Promise.allSettled(
    regions.map((r) => syncAssoc(r))
  );

  const success = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`[SYNC_ALL] Completed: ${success} success, ${failed} failed`);
}
