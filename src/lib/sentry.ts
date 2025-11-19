import * as Sentry from "@sentry/react";

let sentryInitialized = false;

function extractGAClientId(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    const fromLocalStorage = window.localStorage.getItem("_ga");
    if (fromLocalStorage) {
        const parts = fromLocalStorage.split(".");
        if (parts.length >= 4) {
            return parts.slice(-2).join(".");
        }
    }

    const gaCookie = document.cookie
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("_ga="));

    if (gaCookie) {
        const value = gaCookie.split("=")[1];
        const parts = value.split(".");
        if (parts.length >= 4) {
            return parts.slice(-2).join(".");
        }
        return value;
    }

    return null;
}

function attachGAClientId(): void {
    const clientId = extractGAClientId() ?? "unknown";
    try {
        Sentry.setTag("ga_client_id", clientId);
    } catch {
        // 무시
    }
}

/**
 * Sentry 초기화 (클라이언트) - Production 강화 버전
 */
export function initSentry(): void {
    if (sentryInitialized) {
        return;
    }

    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
        // DSN이 없으면 Sentry 초기화하지 않음 (개발 환경)
        console.log("ℹ️ Sentry DSN이 없어 모니터링이 비활성화됩니다.");
        return;
    }

    try {
        Sentry.init({
            dsn,
            integrations: [
                Sentry.browserTracingIntegration({
                    // 성능 모니터링 대상 URL
                    tracePropagationTargets: [
                        "localhost",
                        /^https:\/\/asia-northeast3-yago-vibe-spt\.cloudfunctions\.net/,
                        /^https:\/\/.*\.vercel\.app/,
                    ],
                }),
                Sentry.replayIntegration({
                    // 사용자 세션 재생 (에러 발생 시)
                    maskAllText: true,
                    blockAllMedia: true,
                }),
            ],
            // 성능 모니터링 샘플링 (Production: 0.1 = 10%, Development: 1.0 = 100%)
            tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
            // 세션 재생 샘플링 (에러 발생 시 100%, 정상 세션 10%)
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
            environment: import.meta.env.MODE,
            sendDefaultPii: false,
            // 릴리스 정보 (배포 버전 추적)
            release: import.meta.env.VITE_APP_VERSION || "unknown",
            // 에러 필터링 (불필요한 에러 제외)
            ignoreErrors: [
                // 브라우저 확장 프로그램 에러
                "top.GLOBALS",
                "originalCreateNotification",
                "canvas.contentDocument",
                "MyApp_RemoveAllHighlights",
                "atomicFindClose",
                "fb_xd_fragment",
                "bmi_SafeAddOnload",
                "EBCallBackMessageReceived",
                // 네트워크 에러 (일부는 정상)
                "NetworkError",
                "Network request failed",
                // ResizeObserver 에러 (일부 브라우저)
                "ResizeObserver loop limit exceeded",
            ],
            // 에러 전송 전 필터링
            beforeSend(event, hint) {
                // 개발 환경에서는 콘솔에만 출력
                if (import.meta.env.MODE === "development") {
                    console.log("🔍 Sentry Event:", event);
                }

                // IP 주소 제거 (개인정보 보호)
                if (event.user?.ip_address) {
                    delete event.user.ip_address;
                }

                // 민감한 정보 제거
                if (event.request?.cookies) {
                    delete event.request.cookies;
                }

                return event;
            },
            // 사용자 컨텍스트 설정
            initialScope: {
                tags: {
                    platform: "web",
                    framework: "react",
                },
            },
        });

        attachGAClientId();
        sentryInitialized = true;
        console.log("✅ Sentry 초기화 완료 (모니터링 활성화)");
    } catch (error: any) {
        console.warn("⚠️ Sentry 초기화 실패:", error?.message ?? error);
    }
}

/**
 * 사용자 정보 설정 (로그인 시 호출)
 */
export function setSentryUser(user: { uid: string; email?: string; displayName?: string } | null): void {
    if (!sentryInitialized) {
        return;
    }

    try {
        Sentry.setUser(
            user
                ? {
                      id: user.uid,
                      email: user.email || undefined,
                      username: user.displayName || undefined,
                  }
                : null
        );
    } catch {
        // 무시
    }
}

/**
 * Sentry 에러 캡처
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
    if (!sentryInitialized) {
        return;
    }

    try {
        Sentry.captureException(error, {
            contexts: context ? { custom: context } : undefined,
        });
    } catch {
        // 무시
    }
}

/**
 * Sentry 메시지 캡처
 */
export function captureMessage(
    message: string,
    level: "info" | "warning" | "error" = "info"
): void {
    if (!sentryInitialized) {
        return;
    }

    try {
        Sentry.captureMessage(message, {
            level: level as any,
        });
    } catch {
        // 무시
    }
}

/**
 * 성능 트랜잭션 시작
 */
export function startTransaction(name: string, op: string): any {
    if (!sentryInitialized) {
        return null;
    }

    try {
        return Sentry.startTransaction({
            name,
            op,
        });
    } catch {
        return null;
    }
}
