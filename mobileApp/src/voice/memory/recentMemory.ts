/**
 * 🧩 Recent Memory
 * 최근 컨텍스트 메모리
 */

import type { MemoryItem } from '../types';
import { VOICE_AGENT_CONFIG } from '../config';

/**
 * 메모리에 추가
 */
export function addToMemory(
  memory: MemoryItem[],
  item: MemoryItem
): MemoryItem[] {
  const newMem = [item, ...memory];
  return newMem.slice(0, VOICE_AGENT_CONFIG.maxMemoryItems);
}

/**
 * 마지막 메모리 가져오기
 */
export function getLastMemory(memory: MemoryItem[]): MemoryItem | null {
  return memory[0] || null;
}

/**
 * 대안 후보 가져오기 (SEARCH_ALTERNATIVE용)
 */
export function getAlternativeCandidate(memory: MemoryItem[]): string | null {
  const last = memory[0];
  if (!last?.result?.candidates || last.result.candidates.length <= 1) {
    return null;
  }

  const chosenIndex = last.result.chosenIndex ?? 0;
  const otherCandidates = last.result.candidates.filter(
    (_, i) => i !== chosenIndex
  );

  return otherCandidates[0] || null;
}

/**
 * 메모리 요약 생성 (Agent 전달용)
 */
export function createMemorySummary(memory: MemoryItem[]): string {
  return memory
    .map(
      (m, i) =>
        `${i}. ${m.intent.query} -> ${
          m.result?.destination ?? '검색만'
        }`
    )
    .join('\n');
}

/**
 * 메모리 업데이트
 */
export function updateMemory(
  memory: MemoryItem[],
  index: number,
  updates: Partial<MemoryItem>
): MemoryItem[] {
  const newMem = [...memory];
  if (newMem[index]) {
    newMem[index] = { ...newMem[index], ...updates };
  }
  return newMem;
}
