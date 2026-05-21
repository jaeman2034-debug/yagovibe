/**
 * 🔥 Experiment Assignment - 로컬 고정 할당
 * 
 * 로그인 유저: userId 기반
 * 게스트: localStorage에 고정 seed 저장 → 일관성 유지
 */

import type { ExperimentKey, Variant, ExperimentAssignment } from "./experiment.types";

const KEY_PREFIX = "exp_assign_";

/**
 * 시드 기반 변형 할당 (해시)
 */
function hashToVariant(seed: string): Variant {
  // 간단 해시: 홀짝
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 2 === 0 ? "A" : "B";
}

/**
 * 게스트 시드 보장 (일관성 유지)
 */
function ensureGuestSeed(): string {
  const k = "exp_seed";
  
  if (typeof window === "undefined") {
    // SSR 환경에서는 임시 시드
    return `guest_${Date.now()}`;
  }

  const existing = localStorage.getItem(k);
  if (existing) return existing;

  const seed = `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(k, seed);
  return seed;
}

/**
 * 실험 할당 조회 (캐시 우선)
 */
export function getAssignment(
  key: ExperimentKey,
  userId?: string | null
): ExperimentAssignment {
  const storageKey = `${KEY_PREFIX}${key}`;

  // 캐시 확인
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        return JSON.parse(cached) as ExperimentAssignment;
      } catch {
        // 파싱 실패 시 재생성
      }
    }
  }

  // 새 할당 생성
  const seed = userId
    ? `u:${userId}:${key}` // 로그인 유저
    : `g:${ensureGuestSeed()}:${key}`; // 게스트

  const variant = hashToVariant(seed);

  const assignment: ExperimentAssignment = {
    key,
    variant,
    assignedAt: new Date().toISOString(),
  };

  // 캐시 저장
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey, JSON.stringify(assignment));
  }

  return assignment;
}

/**
 * 할당 초기화 (테스트용)
 */
export function clearAssignment(key: ExperimentKey): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${KEY_PREFIX}${key}`);
}
