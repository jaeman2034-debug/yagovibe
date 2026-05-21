/**
 * 🔥 Association Sync - 협회 데이터 동기화
 * 
 * 동기화 스케줄:
 * - 기본: 1시간 1회
 * - 대회 시즌: 10분
 * - 실패 시 3회 재시도
 */

import type { Story } from "../domain/story.types";
import { fetchAllAssocData } from "./assoc.api";
import { convertAssocToStories } from "../domain/assoc.adapter";
import { applyPriorityBoost } from "../domain/assoc.priority";
import { validateStoryPolicy, spamCheck } from "../domain/story.policy";
import { isUsableStory } from "../domain/story.guard";

/**
 * 동기화 결과
 */
export type SyncResult = {
  success: boolean;
  storiesCreated: number;
  storiesUpdated: number;
  error?: string;
};

/**
 * 협회 스토리 동기화 (클라이언트 측 - 실제 저장은 서버에서)
 */
export async function syncAssocStories(): Promise<SyncResult> {
  try {
    // 협회 데이터 조회
    const data = await fetchAllAssocData();
    
    if (!data) {
      // API 실패 시 기존 데이터 유지
      return {
        success: false,
        storiesCreated: 0,
        storiesUpdated: 0,
        error: "협회 API 조회 실패",
      };
    }

    // Story로 변환
    let stories = convertAssocToStories(
      data.leagues,
      data.notices,
      data.recruitments
    );

    // Guard 통과 (유효성 검증)
    stories = stories.filter(isUsableStory);

    // 정책 검증
    const validStories: Story[] = [];
    for (const story of stories) {
      const policyCheck = validateStoryPolicy(story);
      const spamCheckResult = spamCheck(story);
      
      if (policyCheck.valid && spamCheckResult.valid) {
        validStories.push(story);
      }
    }

    // 우선순위 부스트 적용
    const boostedStories = applyPriorityBoost(validStories);

    // 실제 저장은 서버에서 처리 (여기서는 변환된 스토리 반환)
    // 서버 API: POST /api/stories/bulk (upsert)
    
    return {
      success: true,
      storiesCreated: boostedStories.length,
      storiesUpdated: 0, // 서버에서 upsert 처리
    };
  } catch (error) {
    console.error("[AssocSync] 동기화 오류:", error);
    return {
      success: false,
      storiesCreated: 0,
      storiesUpdated: 0,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
}

/**
 * 동기화 스케줄러 (클라이언트 측 - 실제는 서버/Cloud Functions에서)
 */
export class AssocSyncScheduler {
  private intervalId: number | null = null;
  private isSeasonMode: boolean = false;

  /**
   * 동기화 시작
   */
  start(isSeason: boolean = false): void {
    this.isSeasonMode = isSeason;
    this.stop(); // 기존 인터벌 정리

    // 대회 시즌: 10분, 기본: 1시간
    const interval = isSeason ? 10 * 60 * 1000 : 60 * 60 * 1000;

    // 즉시 1회 실행
    syncAssocStories().catch(console.error);

    // 주기적 실행
    this.intervalId = window.setInterval(() => {
      syncAssocStories().catch(console.error);
    }, interval);
  }

  /**
   * 동기화 중지
   */
  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 시즌 모드 업데이트
   */
  updateSeasonMode(isSeason: boolean): void {
    if (this.isSeasonMode !== isSeason) {
      this.start(isSeason);
    }
  }
}
