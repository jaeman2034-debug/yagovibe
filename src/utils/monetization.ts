/**
 * 💰 수익화 유틸리티
 * UX 안 깨고, 구조 안 흔들고, 바로 돈 되는 루트
 */

/**
 * 사용자 프리미엄 여부 확인
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return userData.isPremium === true;
  } catch {
    return false;
  }
}

/**
 * 프리미엄 알림 우선권: 즉시 발송 vs 지연 발송
 * @param isPremium - 프리미엄 여부
 * @returns 지연 시간 (초 단위, 0이면 즉시)
 */
export function getNotificationDelay(isPremium: boolean): number {
  if (isPremium) {
    return 0; // 즉시 발송
  }
  // 무료: 3~10분 랜덤 지연 (스팸 방지 + 프리미엄 가치)
  const minDelay = 3 * 60; // 3분
  const maxDelay = 10 * 60; // 10분
  return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
}

/**
 * 프리미엄 플랜 제한
 */
export const PREMIUM_LIMITS = {
  free: {
    maxSavedSearches: 2,
    maxRadiusKm: 5,
    maxKeywords: 5,
    dailyNotifications: 5,
  },
  premium: {
    maxSavedSearches: 10,
    maxRadiusKm: Infinity,
    maxKeywords: 10,
    dailyNotifications: Infinity,
  },
} as const;

