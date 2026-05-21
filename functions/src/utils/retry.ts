/**
 * 🔄 Retry 유틸리티
 * Exponential Backoff 재시도 (Rate Limit 대응)
 */

/**
 * 지수 백오프 대기
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Jitter 추가 (랜덤 지연)
 */
function addJitter(baseMs: number): number {
  return baseMs + Math.random() * baseMs * 0.1; // 10% jitter
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Exponential Backoff 재시도
 * 429/503 에러만 재시도
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = (error: any) => {
      // 429 (Rate Limit) 또는 503 (Service Unavailable)만 재시도
      const status = error?.status || error?.response?.status;
      return status === 429 || status === 503;
    },
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // 마지막 시도면 throw
      if (attempt >= maxRetries) {
        break;
      }

      // 재시도 대상이 아니면 throw
      if (!shouldRetry(error)) {
        throw error;
      }

      // Exponential Backoff with Jitter
      const delayMs = Math.min(
        baseDelayMs * Math.pow(2, attempt),
        maxDelayMs
      );
      const jitteredDelay = addJitter(delayMs);

      await sleep(jitteredDelay);
    }
  }

  throw lastError;
}
