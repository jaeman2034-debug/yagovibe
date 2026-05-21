/**
 * 🔥 Story Rate Limit - API 악용·스팸 차단
 * 
 * Rate Limit 규칙:
 * - 작성: 1일 3회(USER)
 * - 로그: 10초 20회
 * - API: IP 기반
 */

/**
 * Rate Limit 타입
 */
export type RateLimitType = "create_story" | "log" | "api";

/**
 * Rate Limit 설정
 */
export const RATE_LIMITS = {
  create_story: {
    max: 3, // 1일 3회
    window: 24 * 60 * 60 * 1000, // 24시간
  },
  log: {
    max: 20, // 10초 20회
    window: 10 * 1000, // 10초
  },
  api: {
    max: 100, // 1분 100회
    window: 60 * 1000, // 1분
  },
} as const;

/**
 * Rate Limit 체크 (클라이언트 측)
 */
export function checkRateLimit(
  type: RateLimitType,
  userId?: string
): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = RATE_LIMITS[type];
  const key = `rate_limit_${type}_${userId || "anonymous"}`;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      // 첫 요청
      const record = {
        count: 1,
        resetAt: Date.now() + limit.window,
      };
      localStorage.setItem(key, JSON.stringify(record));
      return {
        allowed: true,
        remaining: limit.max - 1,
        resetAt: record.resetAt,
      };
    }

    const record = JSON.parse(stored);
    const now = Date.now();

    // 시간 초과 시 리셋
    if (now > record.resetAt) {
      const newRecord = {
        count: 1,
        resetAt: now + limit.window,
      };
      localStorage.setItem(key, JSON.stringify(newRecord));
      return {
        allowed: true,
        remaining: limit.max - 1,
        resetAt: newRecord.resetAt,
      };
    }

    // 제한 초과
    if (record.count >= limit.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
      };
    }

    // 카운트 증가
    record.count++;
    localStorage.setItem(key, JSON.stringify(record));

    return {
      allowed: true,
      remaining: limit.max - record.count,
      resetAt: record.resetAt,
    };
  } catch {
    // localStorage 실패 시 허용 (서버에서 검증)
    return {
      allowed: true,
      remaining: limit.max,
      resetAt: Date.now() + limit.window,
    };
  }
}

/**
 * Rate Limit 기록
 */
export function recordRateLimit(type: RateLimitType, userId?: string): void {
  checkRateLimit(type, userId);
}
