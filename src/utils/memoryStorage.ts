/**
 * 🔥 Memory Storage - 사용자 기억 저장/조회 (Phase 10)
 * 
 * 책임 범위:
 * ✅ localStorage 기반 기억 저장
 * ✅ 기억 조회
 * ✅ 기억 삭제
 * 
 * ❌ 하지 않는 것:
 * - 서버 전송 (Phase 12 이후)
 * - 자동 추론
 */

import type { UserMemory, MemoryMeta } from "@/types/memory";

const STORAGE_KEY = 'yago:userMemory:v1';
const META_STORAGE_KEY = 'yago:memoryMeta:v1';
const MAX_MEMORIES = 10; // 🔥 Phase 10: 최대 10개만 유지

/**
 * 사용자 기억 저장
 */
export function saveMemory(memory: UserMemory): void {
  try {
    const existing = getMemories();
    const updated = [memory, ...existing].slice(0, MAX_MEMORIES); // 최신순, 최대 10개
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log('[MemoryStorage] 기억 저장:', memory);
  } catch (error) {
    console.warn('[MemoryStorage] 기억 저장 실패:', error);
  }
}

/**
 * 모든 기억 조회 (최신순)
 */
export function getMemories(): UserMemory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as UserMemory[];
  } catch (error) {
    console.warn('[MemoryStorage] 기억 조회 실패:', error);
    return [];
  }
}

/**
 * 최근 기억 1개 조회
 */
export function getLatestMemory(): UserMemory | null {
  const memories = getMemories();
  return memories.length > 0 ? memories[0] : null;
}

/**
 * 특정 키워드의 최근 기억 조회
 */
export function getLatestMemoryByKeyword(keyword: string): UserMemory | null {
  const memories = getMemories();
  return memories.find(m => m.keyword === keyword) || null;
}

/**
 * 기억 삭제 (전체)
 */
export function clearMemories(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[MemoryStorage] 기억 삭제 완료');
  } catch (error) {
    console.warn('[MemoryStorage] 기억 삭제 실패:', error);
  }
}

/**
 * 🔥 Phase 11: 최근 기억 1개 삭제
 */
export function removeLatestMemory(): void {
  try {
    const memories = getMemories();
    if (memories.length > 0) {
      const updated = memories.slice(1); // 첫 번째 제거
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('[MemoryStorage] 최근 기억 삭제 완료');
    }
  } catch (error) {
    console.warn('[MemoryStorage] 최근 기억 삭제 실패:', error);
  }
}

/**
 * 🔥 Phase 11: Memory Meta 조회
 */
export function getMemoryMeta(): MemoryMeta {
  try {
    const data = localStorage.getItem(META_STORAGE_KEY);
    if (!data) {
      // 기본값: enabled = true
      return { enabled: true };
    }
    return JSON.parse(data) as MemoryMeta;
  } catch (error) {
    console.warn('[MemoryStorage] Memory Meta 조회 실패:', error);
    return { enabled: true }; // 기본값
  }
}

/**
 * 🔥 Phase 11: Memory Meta 저장
 */
export function saveMemoryMeta(meta: MemoryMeta): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
    console.log('[MemoryStorage] Memory Meta 저장:', meta);
  } catch (error) {
    console.warn('[MemoryStorage] Memory Meta 저장 실패:', error);
  }
}

/**
 * 🔥 Phase 11: 기억 활용 여부 확인
 */
export function isMemoryEnabled(): boolean {
  return getMemoryMeta().enabled;
}

/**
 * 🔥 Phase 11: 상대 시간 포맷 (어제 / 3일 전)
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}
