import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 66: SLO Monitor - SLO 위반 감지 및 알림
 * 매 5분마다 실행하여 SLO 위반 감지
 */

// SLO 정의
const SLO_CONFIG = {
    graphAsk: {
        p95Latency: 900, // ms
        errorRate: 0.01, // 1%
    },
    insights: {
        deliverySuccessRate: 0.99, // 99%
    },
    general: {
        errorRate: 0.01, // 1%
    },
};

/**
 * SLO 위반 알림
 */
async function sendSLOAlert(
    service: string,
    metric: string,
    value: number,
    threshold: number
): Promise<void> {
    const message = `🚨 SLO 위반 감지\n\n서비스: ${service}\n메트릭: ${metric}\n현재 값: ${value}\n임계값: ${threshold}`;

    // Slack 알림
    if (process.env.SLACK_WEBHOOK_URL) {
        try {
            await fetch(process.env.SLACK_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: message }),
            });
        } catch (error) {
            logger.warn("⚠️ Slack 알림 실패:", error);
        }
    }

    // Firestore에 기록
    await db.collection("sloAlerts").add({
        service,
        metric,
        value,
        threshold,
        timestamp: Timestamp.now(),
        resolved: false,
    });

    logger.warn("🚨 SLO 위반:", { service, metric, value, threshold });
}

/**
 * SLO 모니터링 (매 5분마다 실행)
 */
export const sloMonitor = onSchedule(
    {
        schedule: "every 5 minutes",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("📊 SLO 모니터링 시작");

            // 최근 5분간 메트릭 조회
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const metricsRef = db.collection("metrics")
                .where("timestamp", ">=", Timestamp.fromDate(fiveMinutesAgo));

            const metrics = await metricsRef.get();

            if (metrics.empty) {
                logger.info("⚠️ 메트릭 데이터가 없습니다.");
                return;
            }

            // 메트릭 집계
            const serviceMetrics: { [key: string]: any } = {};

            metrics.docs.forEach((doc) => {
                const data = doc.data();
                const service = data.service || "general";

                if (!serviceMetrics[service]) {
                    serviceMetrics[service] = {
                        latencies: [],
                        errors: 0,
                        total: 0,
                    };
                }

                if (data.latency) {
                    serviceMetrics[service].latencies.push(data.latency);
                }

                if (data.error) {
                    serviceMetrics[service].errors++;
                }

                serviceMetrics[service].total++;
            });

            // SLO 검사
            for (const [service, metrics] of Object.entries(serviceMetrics)) {
                const config = (SLO_CONFIG as any)[service] || SLO_CONFIG.general;

                // P95 Latency 검사
                if (config.p95Latency && metrics.latencies.length > 0) {
                    const sorted = metrics.latencies.sort((a: number, b: number) => a - b);
                    const p95Index = Math.floor(sorted.length * 0.95);
                    const p95Latency = sorted[p95Index];

                    if (p95Latency > config.p95Latency) {
                        await sendSLOAlert(service, "p95Latency", p95Latency, config.p95Latency);
                    }
                }

                // Error Rate 검사
                if (config.errorRate && metrics.total > 0) {
                    const errorRate = metrics.errors / metrics.total;

                    if (errorRate > config.errorRate) {
                        await sendSLOAlert(service, "errorRate", errorRate, config.errorRate);
                    }
                }
            }

            logger.info("✅ SLO 모니터링 완료");
        } catch (error: any) {
            logger.error("❌ SLO 모니터링 오류:", error);
        }
    }
);

