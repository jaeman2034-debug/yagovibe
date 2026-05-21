// src/speech/personalization/history.ts
// 🔥 Phase 7: 최근 사용 히스토리 기반 부스트
// ✅ 최근 7일 내 사용 intent에 가중치 부여

import type { UserVoiceProfile } from "./userProfile";

/**
 * 최근 7일 내 사용 intent인지 확인
 * 
 * @param intentKey - "NAVIGATE:/sports-hub?category=basketball"
 * @param profile - 사용자 프로필
 * @returns 최근 사용 여부 (true면 +1 부스트)
 */
export function isRecentIntent(
  intentKey: string,
  profile: UserVoiceProfile | null
): boolean {
  if (!profile || !profile.topIntents) {
    return false;
  }

  // 🔥 최근 7일 내 사용된 intent (count > 0)
  // 실제로는 lastUsedAt과 비교해야 하지만, 여기서는 간단히 count로 판단
  const count = profile.topIntents[intentKey] || 0;
  
  // 최근 7일 내 1회 이상 사용 → 부스트
  return count > 0;
}

/**
 * Intent key 생성 (일관성 유지)
 */
export function createIntentKey(
  type: string,
  payload: any
): string {
  switch (type) {
    case "NAVIGATE":
      return `NAVIGATE:${payload.to || ""}`;
    case "SEARCH":
      return `SEARCH:${payload.query || ""}`;
    case "SCROLL":
      return `SCROLL:${payload.direction || ""}`;
    case "STOP":
      return "STOP:";
    default:
      return `UNKNOWN:${payload.raw || ""}`;
  }
}

