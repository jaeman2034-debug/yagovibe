// src/speech/recommendation/manager.ts
// 🔥 Phase 8: 추천 상태 관리
// ✅ 추천 파이프라인: Command 성공 → 조건 체크 → 추천 후보 → TTS 질문 → 사용자 응답

import type { Recommendation } from "./engine";
import { setRecommendCooldown, isInRecommendCooldown } from "./guard";

/**
 * 추천 상태 관리자
 */
class RecommendationManager {
  private pendingRecommendation: Recommendation | null = null;
  private todayRecommendCount = 0;
  private lastRecommendTime: Date | null = null;

  /**
   * 오늘 추천 횟수 초기화 (하루 2회 제한)
   */
  private initTodayCount(): void {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(`recommend_count_${today}`);
    
    if (stored) {
      this.todayRecommendCount = parseInt(stored, 10);
    } else {
      this.todayRecommendCount = 0;
    }
  }

  /**
   * 오늘 추천 횟수 저장
   */
  private saveTodayCount(): void {
    const today = new Date().toDateString();
    localStorage.setItem(`recommend_count_${today}`, this.todayRecommendCount.toString());
  }

  /**
   * 추천 설정 (pending)
   */
  setPending(recommendation: Recommendation): void {
    this.pendingRecommendation = recommendation;
    this.todayRecommendCount++;
    this.lastRecommendTime = new Date();
    this.saveTodayCount();
  }

  /**
   * 추천 가져오기
   */
  getPending(): Recommendation | null {
    return this.pendingRecommendation;
  }

  /**
   * 추천 초기화 (YES/NO 응답 후)
   */
  clearPending(): void {
    this.pendingRecommendation = null;
  }

  /**
   * 오늘 추천 횟수 가져오기
   */
  getTodayCount(): number {
    this.initTodayCount();
    return this.todayRecommendCount;
  }

  /**
   * 마지막 추천 시간 가져오기
   */
  getLastRecommendTime(): Date | null {
    return this.lastRecommendTime;
  }

  /**
   * 추천 거절 처리 (쿨다운 설정)
   */
  handleRejection(uid: string): void {
    this.clearPending();
    setRecommendCooldown(uid); // 24시간 쿨다운
  }
}

export const recommendationManager = new RecommendationManager();

