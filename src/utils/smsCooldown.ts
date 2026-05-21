/**
 * 🔥 SMS 쿨다운 관리 (비용 최소화)
 * 
 * 역할:
 * - 전화번호별 쿨다운 타이머 (1분)
 * - 동일 유저 재요청 최소화
 * - 불필요한 SMS 전송 차단
 */

// 🔥 쿨다운 시간 (1분)
const SMS_COOLDOWN_MS = 60_000; // 1분

// 🔥 전화번호별 마지막 전송 시간 저장 (메모리 기반)
const lastSentMap = new Map<string, number>();

/**
 * SMS 전송 가능 여부 확인
 * 
 * @param phoneNumber - 전화번호 (예: "+821012345678")
 * @returns 전송 가능 여부 및 남은 시간(초)
 */
export function canSendSMS(phoneNumber: string): { allowed: boolean; remainingSeconds: number } {
  const now = Date.now();
  const lastSent = lastSentMap.get(phoneNumber) ?? 0;
  const elapsed = now - lastSent;
  const remainingSeconds = Math.max(0, Math.ceil((SMS_COOLDOWN_MS - elapsed) / 1000));

  if (elapsed < SMS_COOLDOWN_MS) {
    return { allowed: false, remainingSeconds };
  }

  // 전송 가능 → 마지막 전송 시간 업데이트
  lastSentMap.set(phoneNumber, now);
  return { allowed: true, remainingSeconds: 0 };
}

/**
 * SMS 전송 기록 (쿨다운 타이머 시작)
 * 
 * @param phoneNumber - 전화번호
 */
export function recordSMSSent(phoneNumber: string): void {
  lastSentMap.set(phoneNumber, Date.now());
}

/**
 * 쿨다운 초기화 (테스트/디버깅용)
 */
export function clearCooldown(phoneNumber?: string): void {
  if (phoneNumber) {
    lastSentMap.delete(phoneNumber);
  } else {
    lastSentMap.clear();
  }
}

/**
 * 남은 쿨다운 시간 조회
 * 
 * @param phoneNumber - 전화번호
 * @returns 남은 시간(초)
 */
export function getRemainingCooldown(phoneNumber: string): number {
  const now = Date.now();
  const lastSent = lastSentMap.get(phoneNumber) ?? 0;
  const elapsed = now - lastSent;
  return Math.max(0, Math.ceil((SMS_COOLDOWN_MS - elapsed) / 1000));
}
