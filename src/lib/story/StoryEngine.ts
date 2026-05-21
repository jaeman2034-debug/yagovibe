/**
 * 🔥 Story Engine - 혼합 D 우선순위 로직
 * 
 * 역할:
 * - 운영/협회/사용자 스토리 자동 조합
 * - 시즌/지역 이슈 감지 및 우선순위 조정
 * - 폴백 규칙 적용
 */

import type { Story } from "@/types/story";
import { Timestamp } from "firebase/firestore";

// 스토리 소스 타입 (확장)
export type StorySourceType = "운영" | "협회" | "사용자";

// 우선순위 레벨
export type StoryPriority = 1 | 2 | 3;

// 스토리 조합 규칙
export interface StoryMixRule {
  운영: number; // 운영 스토리 개수
  협회: number; // 협회 스토리 개수
  사용자: number; // 사용자 스토리 개수
  maxTotal: number; // 최대 총 개수
}

// 기본 조합 규칙
const DEFAULT_MIX: StoryMixRule = {
  운영: 2,
  협회: 1,
  사용자: 1,
  maxTotal: 5,
};

// 대회 시즌 조합 규칙
const TOURNAMENT_SEASON_MIX: StoryMixRule = {
  운영: 1,
  협회: 2,
  사용자: 1,
  maxTotal: 5,
};

// 지역 이슈 조합 규칙
const REGIONAL_ISSUE_MIX: StoryMixRule = {
  운영: 2,
  협회: 0,
  사용자: 2,
  maxTotal: 5,
};

/**
 * 시즌 감지 (대회 시즌 여부)
 */
export function isTournamentSeason(stories: Story[]): boolean {
  // 협회 스토리가 2개 이상이면 대회 시즌으로 간주
  const associationStories = stories.filter(
    (s) => s.source === "ops" && s.metadata?.tournamentName
  );
  return associationStories.length >= 2;
}

/**
 * 지역 이슈 감지
 */
export function hasRegionalIssue(stories: Story[], region?: string): boolean {
  if (!region) return false;
  
  // 특정 지역의 사용자 스토리가 2개 이상이면 지역 이슈로 간주
  const regionalStories = stories.filter(
    (s) => s.region === region && s.source === "user"
  );
  return regionalStories.length >= 2;
}

/**
 * 스토리 우선순위 계산
 */
export function calculateStoryPriority(story: Story): StoryPriority {
  // 운영 스토리: 최우선
  if (story.source === "ops") {
    return 1;
  }
  
  // 협회 스토리: 2순위
  if (story.metadata?.associationId) {
    return 2;
  }
  
  // 사용자 스토리: 인기도 기반
  const popularity = (story.stats?.likes || 0) + (story.stats?.views || 0) * 0.1;
  
  if (popularity > 50) return 2; // 인기 사용자 스토리
  return 3; // 일반 사용자 스토리
}

/**
 * 스토리 정렬 (우선순위 + 최신순)
 */
export function sortStoriesByPriority(stories: Story[]): Story[] {
  return [...stories].sort((a, b) => {
    const priorityA = calculateStoryPriority(a);
    const priorityB = calculateStoryPriority(b);
    
    // 우선순위가 다르면 우선순위로 정렬
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // 우선순위가 같으면 최신순
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

/**
 * 혼합 D 엔진 - 스토리 조합
 * 
 * @param allStories - 전체 스토리 배열
 * @param region - 지역 필터 (선택)
 * @returns 조합된 스토리 배열 (최대 5개)
 */
export function mixStories(
  allStories: Story[],
  region?: string
): Story[] {
  // 만료 필터링
  const now = Timestamp.now().seconds;
  const validStories = allStories.filter(
    (s) => s.status === "published" && s.expiresAt > now
  );

  // 지역 필터링
  const filteredStories = region
    ? validStories.filter((s) => !s.region || s.region === region)
    : validStories;

  // 조합 규칙 결정
  let mixRule: StoryMixRule = DEFAULT_MIX;
  
  if (isTournamentSeason(filteredStories)) {
    mixRule = TOURNAMENT_SEASON_MIX;
  } else if (hasRegionalIssue(filteredStories, region)) {
    mixRule = REGIONAL_ISSUE_MIX;
  }

  // 소스별 분류
  const opsStories = filteredStories.filter((s) => s.source === "ops");
  const associationStories = filteredStories.filter(
    (s) => s.source === "ops" && s.metadata?.associationId
  );
  const userStories = filteredStories.filter((s) => s.source === "user");

  // 우선순위 정렬
  const sortedOps = sortStoriesByPriority(opsStories);
  const sortedAssociation = sortStoriesByPriority(associationStories);
  const sortedUser = sortStoriesByPriority(userStories);

  // 조합
  const mixed: Story[] = [];
  
  // 운영 스토리 (협회 제외)
  const opsNonAssociation = sortedOps.filter(
    (s) => !s.metadata?.associationId
  );
  mixed.push(...opsNonAssociation.slice(0, mixRule.운영));

  // 협회 스토리
  if (mixRule.협회 > 0) {
    mixed.push(...sortedAssociation.slice(0, mixRule.협회));
  }

  // 사용자 스토리
  if (mixRule.사용자 > 0) {
    // 이미 추가된 스토리 제외
    const addedIds = new Set(mixed.map((s) => s.id));
    const availableUser = sortedUser.filter((s) => !addedIds.has(s.id));
    mixed.push(...availableUser.slice(0, mixRule.사용자));
  }

  // 최종 정렬 및 제한
  const final = sortStoriesByPriority(mixed);
  
  return final.slice(0, mixRule.maxTotal);
}

/**
 * 폴백 스토리 생성 (데이터 없을 때)
 */
export function createFallbackStories(): Story[] {
  const now = Date.now() / 1000;
  
  return [
    {
      id: "fallback-1",
      sport: "soccer",
      source: "ops",
      type: "image",
      mediaUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23059669' width='800' height='600'/%3E%3Ctext fill='%23ffffff' font-family='Arial, sans-serif' font-size='72' font-weight='bold' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E🏆%3C/text%3E%3C/svg%3E",
      title: "이번 주 대회 일정",
      subtitle: "지역 리그 경기 시간표를 확인하세요",
      cta: {
        type: "match_today",
        label: "일정 보기",
      },
      stats: { views: 0, likes: 0 },
      status: "published",
      expiresAt: now + 86400 * 7,
      createdAt: now,
      createdBy: "system",
    },
    {
      id: "fallback-2",
      sport: "soccer",
      source: "ops",
      type: "image",
      mediaUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%231e40af' width='800' height='600'/%3E%3Ctext fill='%23ffffff' font-family='Arial, sans-serif' font-size='72' font-weight='bold' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E👥%3C/text%3E%3C/svg%3E",
      title: "우리 동네 팀 모집",
      subtitle: "주 1회 · 초보 환영",
      cta: {
        type: "teams",
        label: "팀 찾기",
      },
      stats: { views: 0, likes: 0 },
      status: "published",
      expiresAt: now + 86400 * 7,
      createdAt: now,
      createdBy: "system",
    },
    {
      id: "fallback-3",
      sport: "soccer",
      source: "ops",
      type: "image",
      mediaUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23dc2626' width='800' height='600'/%3E%3Ctext fill='%23ffffff' font-family='Arial, sans-serif' font-size='72' font-weight='bold' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E🛒%3C/text%3E%3C/svg%3E",
      title: "축구화 중고 특가",
      subtitle: "오늘 등록 24건",
      cta: {
        type: "market",
        label: "보러가기",
      },
      stats: { views: 0, likes: 0 },
      status: "published",
      expiresAt: now + 86400 * 7,
      createdAt: now,
      createdBy: "system",
    },
  ];
}
