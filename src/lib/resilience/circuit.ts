/**
 * Step 66: Circuit Breaker + 지수 백오프
 * 회복력 패턴: 실패 임계치 도달 시 자동 차단, 지수 백오프 재시도
 */

export class Circuit {
    private failures = 0;
    private openUntil = 0;
    private state: "closed" | "open" | "half-open" = "closed";

    constructor(
        private threshold: number = 5,
        private coolMs: number = 8000
    ) {}

    /**
     * 회로가 통과 가능한지 확인
     */
    canPass(): boolean {
        if (this.state === "closed") {
            return true;
        }

        if (this.state === "open") {
            if (Date.now() > this.openUntil) {
                this.state = "half-open";
                return true;
            }
            return false;
        }

        // half-open: 한 번 시도 허용
        return true;
    }

    /**
     * 실패 기록
     */
    fail(): void {
        this.failures++;

        if (this.failures >= this.threshold) {
            this.state = "open";
            this.openUntil = Date.now() + this.coolMs;
            this.failures = 0;
        }
    }

    /**
     * 성공 기록
     */
    succeed(): void {
        this.failures = 0;
        if (this.state === "half-open") {
            this.state = "closed";
        }
    }

    /**
     * 현재 상태 조회
     */
    getState(): "closed" | "open" | "half-open" {
        return this.state;
    }

    /**
     * 통계 조회
     */
    getStats(): { failures: number; state: string; openUntil?: number } {
        return {
            failures: this.failures,
            state: this.state,
            openUntil: this.openUntil > 0 ? this.openUntil : undefined,
        };
    }
}

/**
 * Circuit Breaker로 함수 실행
 */
export async function withBreaker<T>(
    cb: Circuit,
    fn: () => Promise<T>
): Promise<T> {
    if (!cb.canPass()) {
        throw new Error("circuit_open");
    }

    try {
        const r = await fn();
        cb.succeed();
        return r;
    } catch (e) {
        cb.fail();
        throw e;
    }
}

/**
 * 지수 백오프 재시도
 */
export async function retry<T>(
    fn: () => Promise<T>,
    times: number = 3,
    initialDelay: number = 200
): Promise<T> {
    let d = initialDelay;
    let last: any;

    for (let i = 0; i < times; i++) {
        try {
            return await fn();
        } catch (e) {
            last = e;
            if (i < times - 1) {
                // 마지막 시도가 아니면 대기
                await new Promise((r) => setTimeout(r, d));
                d *= 2; // 지수 백오프
            }
        }
    }

    throw last;
}

/**
 * Circuit Breaker + 재시도 조합
 */
export async function withBreakerAndRetry<T>(
    cb: Circuit,
    fn: () => Promise<T>,
    retryTimes: number = 3
): Promise<T> {
    return withBreaker(cb, () => retry(fn, retryTimes));
}

