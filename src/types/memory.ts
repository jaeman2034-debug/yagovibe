/**
 * 🔥 Memory Contract - 사용자 기억 타입 정의 (Phase 10)
 * 
 * 원칙:
 * - 사용자가 "선택한 것"만 기억
 * - 사실 기록만 (추론/확장 금지)
 */

export type UserMemory = {
  placeId: string;
  keyword: string;
  lat: number;
  lng: number;
  timestamp: number;
};

/**
 * 🔥 Phase 11: Memory Meta - 기억 활용 제어
 */
export type MemoryMeta = {
  enabled: boolean; // 사용자 토글
  lastUsedAt?: number; // 마지막 활용 시점
};
