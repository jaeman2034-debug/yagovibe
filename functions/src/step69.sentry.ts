/**
 * Step 69: Sentry Integration - 서버 관찰성
 * Production Hardening & Launch Readiness
 */

let sentryInitialized = false;

/**
 * Sentry 초기화 (서버)
 */
export function initSentryServer(): void {
    if (sentryInitialized) {
        return;
    }

    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
        console.warn("⚠️ Sentry DSN이 설정되지 않았습니다.");
        return;
    }

    try {
        const Sentry = require("@sentry/node");
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || "production",
            tracesSampleRate: 0.2, // 20% 샘플링
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
            ],
            beforeSend(event, hint) {
                // PII 제거 (Step 62)
                if (event.request?.url) {
                    event.request.url = event.request.url.replace(
                        /[\w.-]+@[\w.-]+\.\w+/g,
                        "[email]"
                    );
                }
                return event;
            },
        });

        sentryInitialized = true;
        console.log("✅ Sentry (서버) 초기화 완료");
    } catch (error) {
        console.error("❌ Sentry (서버) 초기화 실패:", error);
    }
}

/**
 * Sentry 에러 캡처
 */
export function captureExceptionServer(error: Error, context?: any): void {
    if (!sentryInitialized) {
        return;
    }

    try {
        const Sentry = require("@sentry/node");
        Sentry.captureException(error, {
            contexts: {
                custom: context,
            },
        });
    } catch (e) {
        console.error("Sentry 캡처 실패:", e);
    }
}

