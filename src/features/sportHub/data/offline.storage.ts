/**
 * 🔥 Offline Storage - 오프라인/저속망 대응
 * 
 * 전략: Local Cache → Seed → API
 * 인터넷 없어도 무조건 동작
 */

import type { Story } from "../domain/story.types";

const STORIES_KEY = "sporthub_stories";
const LOGS_KEY = "story_logs_queue";

/**
 * 캐시된 스토리 타입
 */
type CachedStories = {
  stories: Story[];
  savedAt: string;
  ttl: number; // 10분
};

/**
 * 스토리 캐시 저장
 */
export function saveStoriesCache(stories: Story[]): void {
  try {
    const payload: CachedStories = {
      stories,
      savedAt: new Date().toISOString(),
      ttl: 10 * 60 * 1000, // 10분
    };
    localStorage.setItem(STORIES_KEY, JSON.stringify(payload));
  } catch (error) {
    // localStorage 실패 시 무시 (용량 초과 등)
    console.warn("[OfflineStorage] 캐시 저장 실패:", error);
  }
}

/**
 * 스토리 캐시 로드
 */
export function loadStoriesCache(): Story[] | null {
  try {
    const raw = localStorage.getItem(STORIES_KEY);
    if (!raw) return null;

    const payload: CachedStories = JSON.parse(raw);
    const age = Date.now() - new Date(payload.savedAt).getTime();

    // TTL 내 캐시만 반환
    return age < payload.ttl ? payload.stories : null;
  } catch {
    return null;
  }
}

/**
 * 로그 큐에 추가 (오프라인 보존)
 */
export function queueLog(log: unknown): void {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    const queue: unknown[] = raw ? JSON.parse(raw) : [];
    queue.push(log);
    
    // 최대 100개까지만 보관 (용량 제한)
    const trimmed = queue.slice(-100);
    localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("[OfflineStorage] 로그 큐 저장 실패:", error);
  }
}

/**
 * 로그 큐 조회
 */
export function getLogQueue(): unknown[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 로그 큐 비우기
 */
export function clearLogQueue(): void {
  try {
    localStorage.removeItem(LOGS_KEY);
  } catch {
    // 무시
  }
}

/**
 * 온라인 상태 확인
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}
