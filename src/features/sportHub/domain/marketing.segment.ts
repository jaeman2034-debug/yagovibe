/**
 * 🔥 Marketing Segment - 세그먼트 매칭
 * 
 * 지역, 관심 카테고리, 레벨 기반 타겟팅
 */

import type { MarketingSegment } from "./marketing.types";
import type { Region } from "./region.types";
import type { StoryCategory } from "./story.types";

/**
 * 사용자 프로필 (세그먼트 매칭용)
 */
export type UserProfile = {
  userId: string;
  region: Region;
  level?: "beginner" | "normal" | "pro";
  interests?: StoryCategory[];
  lastActiveAt: string;
  viewedCategories?: StoryCategory[];
  clickedCategories?: StoryCategory[];
};

/**
 * 세그먼트 매칭
 */
export function matchSegment(
  user: UserProfile,
  segment: MarketingSegment
): boolean {
  // 지역 매칭
  if (segment.region && user.region !== segment.region) {
    return false;
  }
  
  // 레벨 매칭
  if (segment.level && user.level !== segment.level) {
    return false;
  }
  
  // 카테고리 매칭
  if (segment.category && segment.category.length > 0) {
    const userInterests = user.interests || user.viewedCategories || [];
    const hasMatch = segment.category.some((cat) => userInterests.includes(cat));
    if (!hasMatch) {
      return false;
    }
  }
  
  // 마지막 접속일 매칭
  if (segment.lastActiveDays !== undefined) {
    const lastActive = new Date(user.lastActiveAt).getTime();
    const now = Date.now();
    const daysSinceActive = Math.floor((now - lastActive) / (24 * 60 * 60 * 1000));
    
    if (daysSinceActive < segment.lastActiveDays) {
      return false;
    }
  }
  
  return true;
}

/**
 * 세그먼트 우선순위 계산
 */
export function calculateSegmentPriority(
  user: UserProfile,
  segment: MarketingSegment
): number {
  let score = 0;
  
  // 지역 일치
  if (segment.region === user.region) {
    score += 30;
  }
  
  // 레벨 일치
  if (segment.level === user.level) {
    score += 20;
  }
  
  // 카테고리 일치
  if (segment.category && segment.category.length > 0) {
    const userInterests = user.interests || user.viewedCategories || [];
    const matchCount = segment.category.filter((cat) => userInterests.includes(cat)).length;
    score += matchCount * 10;
  }
  
  return score;
}

/**
 * 사용자 세그먼트 자동 추론
 */
export function inferUserSegment(user: UserProfile): MarketingSegment {
  return {
    region: user.region,
    level: user.level,
    category: user.interests || user.viewedCategories,
  };
}
