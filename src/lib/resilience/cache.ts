/**
 * Step 66: 캐시 + 강제 제한(Limiter)
 * 메모리 캐시 및 슬라이딩 윈도우 제한
 */

type CacheEntry<T> = {
    v: T;
    exp: number;
};

const mem = new Map<string, CacheEntry<any>>();

/**
 * 캐시 조회
 */
export function cacheGet<T>(k: string): T | undefined {
    const x = mem.get(k);
    if (!x) {
        return undefined;
    }

    if (Date.now() > x.exp) {
        mem.delete(k);
        return undefined;
    }

    return x.v as T;
}

/**
 * 캐시 저장
 */
export function cacheSet<T>(k: string, v: T, ttlMs: number = 30000): void {
    mem.set(k, {
        v,
        exp: Date.now() + ttlMs,
    });
}

/**
 * 캐시 삭제
 */
export function cacheDelete(k: string): void {
    mem.delete(k);
}

/**
 * 캐시 클리어
 */
export function cacheClear(): void {
    mem.clear();
}

/**
 * 캐시된 함수 실행 (캐시 히트 시 즉시 반환)
 */
export async function cached<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>
): Promise<T> {
    const hit = cacheGet<T>(key);
    if (hit !== undefined) {
        return hit;
    }

    const val = await fn();
    cacheSet(key, val, ttl);
    return val;
}

/**
 * 슬라이딩 윈도우 제한 (Throttle)
 */
let lastCall = 0;

/**
 * 최소 간격 내 호출 차단
 */
export async function throttle(minIntervalMs: number = 120): Promise<void> {
    const now = Date.now();
    const wait = Math.max(0, minIntervalMs - (now - lastCall));
    lastCall = now + wait;

    if (wait > 0) {
        await new Promise((r) => setTimeout(r, wait));
    }
}

/**
 * Rate Limiter (슬라이딩 윈도우)
 */
class RateLimiter {
    private calls: number[] = [];

    constructor(
        private maxCalls: number,
        private windowMs: number
    ) {}

    /**
     * 호출 허용 여부 확인
     */
    async check(): Promise<boolean> {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // 오래된 호출 제거
        this.calls = this.calls.filter((t) => t > windowStart);

        if (this.calls.length >= this.maxCalls) {
            return false;
        }

        this.calls.push(now);
        return true;
    }

    /**
     * 대기 후 호출 (제한 초과 시)
     */
    async waitIfNeeded(): Promise<void> {
        if (!(await this.check())) {
            const oldest = Math.min(...this.calls);
            const waitTime = oldest + this.windowMs - Date.now();
            if (waitTime > 0) {
                await new Promise((r) => setTimeout(r, waitTime));
            }
        }
    }
}

/**
 * Rate Limiter 인스턴스 생성
 */
export function createRateLimiter(
    maxCalls: number,
    windowMs: number
): RateLimiter {
    return new RateLimiter(maxCalls, windowMs);
}

