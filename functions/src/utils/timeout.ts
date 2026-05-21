/**
 * ⏱️ Timeout 유틸리티
 * 서버 타임아웃 처리
 */

/**
 * 타임아웃 래퍼
 * 지정 시간 내에 완료되지 않으면 reject
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * 기본 타임아웃 설정
 */
export const DEFAULT_TIMEOUT_MS = 2500; // 2.5초
