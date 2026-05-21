/**
 * 🔥 Dashboard Health - 허브 건강 상태 계산
 * 
 * 오늘 허브가 건강한가
 */

import type { HubHealth, DashboardRisk } from "./dashboard.types";
import type { Story } from "./story.types";

/**
 * 스토리 채움률 계산
 */
export function calculateStoryFillRate(
  stories: Story[],
  maxSlots: number = 5
): number {
  const activeStories = stories.filter(
    (s) => s.status === "PUBLISHED" && new Date(s.endAt).getTime() > Date.now()
  );
  
  return Math.min((activeStories.length / maxSlots) * 100, 100);
}

/**
 * 허브 건강 상태 계산
 */
export function calculateHubHealth(
  stories: Story[],
  seasonMode: boolean,
  apiErrors: number,
  cacheHitRate: number,
  avgResponseTime: number
): HubHealth {
  return {
    storyFillRate: calculateStoryFillRate(stories),
    seasonMode,
    apiError: apiErrors,
    cacheHitRate,
    avgResponseTime,
  };
}

/**
 * 건강 점수 (0-100)
 */
export function calculateHealthScore(health: HubHealth): number {
  let score = 100;
  
  // 스토리 채움률 (40점)
  score -= (100 - health.storyFillRate) * 0.4;
  
  // API 에러 (30점)
  score -= Math.min(health.apiError * 5, 30);
  
  // 캐시 적중률 (20점)
  score -= (100 - health.cacheHitRate) * 0.2;
  
  // 응답 시간 (10점)
  if (health.avgResponseTime > 1000) {
    score -= Math.min((health.avgResponseTime - 1000) / 100, 10);
  }
  
  return Math.max(0, Math.round(score));
}

/**
 * 위험 신호 감지
 */
export function detectRisks(
  stories: Story[],
  ctrMap: Map<string, number>,
  paymentFailCount: number,
  apiErrorCount: number,
  seasonMode: boolean,
  hasActiveLeague: boolean
): DashboardRisk {
  const lowCTRStories: string[] = [];
  const expiringSoon: string[] = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  for (const story of stories) {
    // CTR < 1% 스토리
    const ctr = ctrMap.get(story.id) || 0;
    if (ctr < 1 && story.status === "PUBLISHED") {
      lowCTRStories.push(story.id);
    }
    
    // 24시간 이내 만료
    const expiresAt = new Date(story.endAt).getTime();
    if (expiresAt > now && expiresAt - now < oneDay) {
      expiringSoon.push(story.id);
    }
  }
  
  // 빈 슬롯 수
  const activeStories = stories.filter(
    (s) => s.status === "PUBLISHED" && new Date(s.endAt).getTime() > now
  );
  const emptySlots = Math.max(0, 5 - activeStories.length);
  
  // 시즌 모드 불일치 (대회 있는데 시즌 모드 꺼짐)
  const seasonModeOff = hasActiveLeague && !seasonMode;
  
  return {
    lowCTRStories,
    expiringSoon,
    paymentFail: paymentFailCount,
    apiErrors: apiErrorCount,
    emptySlots,
    seasonModeOff,
  };
}
