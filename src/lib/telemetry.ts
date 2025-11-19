/**
 * Step 68: Real-World Pilot & Telemetry Review
 * 프론트엔드 텔레메트리 SDK
 */

export type EventInput = {
    type: string;
    teamId?: string;
    perf?: {
        name?: string;
        durMs?: number;
        ttfb?: number;
        sizeKb?: number;
    };
    meta?: any;
};

/**
 * 기본 이벤트 데이터 생성
 */
function base(): {
    ts: string;
    orgId: string;
    teamId?: string;
    userId?: string;
    sessionId: string;
    ctx: {
        page: string;
        device: string;
        region: string;
        appVer: string;
    };
} {
    // Session ID 생성 또는 조회
    let sessionId = sessionStorage.getItem("telemetry_sid");
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("telemetry_sid", sessionId);
    }

    return {
        ts: new Date().toISOString(),
        orgId: (window as any).__ORG_ID__ || "demo-org",
        teamId: (window as any).__TEAM_ID__,
        userId: (window as any).__USER_ID__,
        sessionId,
        ctx: {
            page: location.pathname,
            device: navigator.userAgent,
            region: (window as any).__REGION__ || "kr",
            appVer: (import.meta as any).env.APP_VERSION || "0.0.0",
        },
    };
}

/**
 * 성능 마킹 (시작 시간 저장)
 */
export function markStart(name: string): number {
    return performance.now();
}

/**
 * 성능 측정 (시작 시간부터 경과 시간 계산)
 */
export function markPerf(name: string, t0: number): {
    name: string;
    durMs: number;
} {
    const dur = performance.now() - t0;
    return {
        name,
        durMs: Math.round(dur),
    };
}

/**
 * TTFB (Time To First Byte) 측정
 */
export async function markTTFB(url: string): Promise<number> {
    const start = performance.now();
    try {
        const response = await fetch(url, { method: "HEAD" });
        await response.headers;
        return Math.round(performance.now() - start);
    } catch {
        return 0;
    }
}

/**
 * 이벤트 발송
 */
export async function emit(ev: EventInput): Promise<void> {
    const body = {
        ...base(),
        ...ev,
    };

    try {
        const functionsOrigin =
            import.meta.env.VITE_FUNCTIONS_ORIGIN ||
            "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

        await fetch(`${functionsOrigin}/telemetryIngest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch (error) {
        // 실패 시 샘플링 저장 후 BG Sync 전송 (선택)
        console.warn("텔레메트리 전송 실패:", error);
        
        // 오프라인 큐에 저장 (Step 67)
        try {
            const { enqueueOp } = await import("./offlineQueue");
            await enqueueOp({
                url: `${functionsOrigin}/telemetryIngest`,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        } catch (e) {
            console.error("오프라인 큐 저장 실패:", e);
        }
    }
}

/**
 * 간편 이벤트 발송 (타입만)
 */
export async function emitSimple(type: string, meta?: any): Promise<void> {
    await emit({ type, meta });
}

/**
 * 성능 이벤트 발송 (측정 포함)
 */
export async function emitPerf(
    type: string,
    t0: number,
    meta?: any
): Promise<void> {
    const perf = markPerf(type, t0);
    await emit({
        type,
        perf,
        meta,
    });
}

