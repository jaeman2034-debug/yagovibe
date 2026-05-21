// src/speech/recommendation/guard.ts
// 🔥 Phase 8: 추천 허용 조건 체크 (가장 중요)
// ✅ 추천은 방해 ❌ / 강요 ❌ / 항상 끌 수 있음

import type { UserVoiceProfile } from "../personalization/userProfile";

export interface RecommendationContext {
  pathname: string;
  isMobile: boolean;
  userProfile: UserVoiceProfile | null;
  lastRecommendTime?: Date;
  todayRecommendCount: number;
  lastCommandSuccess: boolean;
  lastCommandTime?: Date;
}

/**
 * 추천이 "허용되는 순간" 정의
 * 
 * ✅ 추천 허용 조건 (ALL 만족):
 * - 모바일 ✅
 * - 음성 세션 직후 또는 명령 성공 후
 * - 최근 7일 내 동일 intent 2회 이상
 * - confidence ≥ 0.85
 * - 하루 최대 2회
 * 
 * ❌ 절대 금지:
 * - 앱 진입 즉시
 * - 로그인/결제/민감 화면
 * - 연속 추천
 * - 실패 직후
 */
export function canRecommend(context: RecommendationContext): boolean {
  const {
    pathname,
    isMobile,
    userProfile,
    lastRecommendTime,
    todayRecommendCount,
    lastCommandSuccess,
    lastCommandTime,
  } = context;

  // 🔥 필수 조건 1: 모바일만
  if (!isMobile) {
    return false;
  }

  // 🔥 필수 조건 2: 명령 성공 후 (실패 직후 ❌)
  if (!lastCommandSuccess || !lastCommandTime) {
    return false;
  }

  // 🔥 필수 조건 3: 명령 성공 후 3초 이내 (음성 세션 직후)
  const timeSinceCommand = Date.now() - lastCommandTime.getTime();
  if (timeSinceCommand > 3000) {
    return false; // 너무 오래됨
  }

  // 🔥 필수 조건 4: 하루 최대 2회
  if (todayRecommendCount >= 2) {
    return false;
  }

  // 🔥 필수 조건 5: 연속 추천 방지 (최소 1시간 간격)
  if (lastRecommendTime) {
    const timeSinceLastRecommend = Date.now() - lastRecommendTime.getTime();
    if (timeSinceLastRecommend < 60 * 60 * 1000) {
      return false; // 1시간 이내 추천 ❌
    }
  }

  // 🔥 필수 조건 6: 차단된 화면 체크
  const blockedPaths = [
    "/login",
    "/signup",
    "/payment",
    "/checkout",
    "/admin",
  ];
  
  if (blockedPaths.some((blocked) => pathname.startsWith(blocked))) {
    return false;
  }

  // 🔥 필수 조건 7: 사용자 프로필 필요 (최근 intent 히스토리)
  if (!userProfile || !userProfile.topIntents || Object.keys(userProfile.topIntents).length === 0) {
    return false;
  }

  return true;
}

/**
 * 추천 쿨다운 설정 (24시간)
 */
export function setRecommendCooldown(uid: string): void {
  const key = `recommend_cooldown_${uid}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24시간
  localStorage.setItem(key, expiresAt.toString());
}

/**
 * 추천 쿨다운 체크
 */
export function isInRecommendCooldown(uid: string): boolean {
  const key = `recommend_cooldown_${uid}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) {
    return false;
  }

  const expiresAt = parseInt(stored, 10);
  if (Date.now() > expiresAt) {
    localStorage.removeItem(key);
    return false;
  }

  return true;
}

