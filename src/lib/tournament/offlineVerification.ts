/**
 * 오프라인 검인 저장 및 동기화 유틸리티
 */

import type { Match, MatchPlayer } from "@/types/tournament";

const STORAGE_KEY_PREFIX = "tournament_verification_pending_";

/**
 * 오프라인 검인 기록 인터페이스
 */
export interface OfflineVerification {
  id: string;
  matchId: string;
  division: string;
  associationId: string;
  tournamentId: string;
  playerId: string;
  team: "home" | "away";
  status: MatchPlayer["verificationStatus"];
  timestamp: number; // 로컬 타임스탬프
  verifiedBy?: string;
  verifiedByName?: string;
}

/**
 * 오프라인 검인 저장
 */
export function saveOfflineVerification(verification: OfflineVerification): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${verification.matchId}`;
    const existing = getOfflineVerifications(verification.matchId);
    const updated = [...existing.filter((v) => v.playerId !== verification.playerId), verification];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error("[OfflineVerification] 저장 오류:", error);
  }
}

/**
 * 오프라인 검인 목록 조회
 */
export function getOfflineVerifications(matchId: string): OfflineVerification[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}${matchId}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as OfflineVerification[];
  } catch (error) {
    console.error("[OfflineVerification] 조회 오류:", error);
    return [];
  }
}

/**
 * 오프라인 검인 동기화 (서버로 전송 후 삭제)
 */
export async function syncOfflineVerifications(
  matchId: string,
  syncFn: (verification: OfflineVerification) => Promise<void>
): Promise<{ success: number; failed: number }> {
  const pending = getOfflineVerifications(matchId);
  let success = 0;
  let failed = 0;

  for (const verification of pending) {
    try {
      await syncFn(verification);
      success++;
    } catch (error) {
      console.error("[OfflineVerification] 동기화 실패:", verification, error);
      failed++;
    }
  }

  // 성공한 항목만 삭제
  if (success > 0) {
    const remaining = pending.slice(success);
    const key = `${STORAGE_KEY_PREFIX}${matchId}`;
    if (remaining.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(remaining));
    }
  }

  return { success, failed };
}

/**
 * 모든 오프라인 검인 정리 (테스트용)
 */
export function clearAllOfflineVerifications(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("[OfflineVerification] 정리 오류:", error);
  }
}


