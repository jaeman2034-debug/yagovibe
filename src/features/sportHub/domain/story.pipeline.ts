/**
 * 🔥 Story Pipeline - 편성 파이프라인
 * 
 * 파이프라인 단계:
 * 1. 유효성 검증
 * 2. 출처 가중치
 * 3. 품질 필터
 * 4. 슬롯 배정
 */

import type { Story, StorySource } from "./story.types";
import { isUsableStory } from "./story.guard";
import { isExpired } from "./story.expiration.policy";
import { PRIORITY_RULES, USER_CONTENT_CRITERIA, canAutoApproveUserStory } from "./story.operation.rules";

// 파이프라인 단계 타입
type PipelineStep = (stories: Story[]) => Story[];

/**
 * 1단계: 유효성 검증
 */
function validate(stories: Story[]): Story[] {
  const now = Date.now() / 1000;
  
  return stories.filter((story) => {
    // 기본 유효성
    if (!isUsableStory(story)) return false;
    
    // 만료 확인
    if (isExpired(story.expiresAt || now + 86400)) return false;
    
    // 상태 확인 (PUBLISHED만 통과)
    if (story.status !== "published") return false;
    
    return true;
  });
}

/**
 * 2단계: 출처 가중치 적용
 */
function weightBySource(stories: Story[]): Story[] {
  return stories.map((story) => {
    const source = story.source;
    const rule = PRIORITY_RULES[source];
    
    // 우선순위가 없으면 기본값 설정
    if (!story.priority) {
      story.priority = source === "사용자" 
        ? 0 
        : Math.floor((rule.min + rule.max) / 2);
    }
    
    // 사용자 스토리는 score 기반으로 priority 보정
    if (source === "사용자" && story.score) {
      const effectiveScore = story.score + 
        (story.isVerifiedAuthor ? USER_CONTENT_CRITERIA.verifiedAuthorBonus : 0);
      
      // score를 priority로 변환 (0-50 범위)
      story.priority = Math.min(50, Math.floor(effectiveScore / 2));
    }
    
    return story;
  });
}

/**
 * 3단계: 품질 필터
 */
function qualityFilter(stories: Story[]): Story[] {
  return stories.filter((story) => {
    // 사용자 스토리는 자동 승인 가능한 것만
    if (story.source === "사용자") {
      return canAutoApproveUserStory(story);
    }
    
    // 운영/협회는 모두 통과
    return true;
  });
}

/**
 * 4단계: 슬롯 배정 (우선순위 정렬)
 */
function slotAssign(stories: Story[], maxSlots: number = 5): Story[] {
  return stories
    .slice()
    .sort((a, b) => {
      // 우선순위가 높을수록 우선
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // 우선순위가 같으면 score
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      
      // 최신순
      return (b.publishedAt ? new Date(b.publishedAt).getTime() : 0) - 
             (a.publishedAt ? new Date(a.publishedAt).getTime() : 0);
    })
    .slice(0, maxSlots);
}

/**
 * 편성 파이프라인 실행
 */
export const pipeline: PipelineStep[] = [
  validate,
  weightBySource,
  qualityFilter,
  (stories) => slotAssign(stories, 5), // 고정 5개
];

/**
 * 파이프라인 실행
 */
export function runPipeline(stories: Story[]): Story[] {
  return pipeline.reduce((acc, step) => step(acc), stories);
}
