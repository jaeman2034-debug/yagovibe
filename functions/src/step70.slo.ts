import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";
import { setSecurityHeaders } from "./step69.securityHeaders";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 70: SLO (Service Level Objectives) 관리
 * Post-Launch SRE & Growth Experiments
 */

/**
 * SLO 스키마
 */
export interface SLO {
    metric: string; // 예: "availability", "errorRate", "graphAskP95", "offlineSyncSuccess", "notificationDelivery"
    target: number; // 목표치 (예: 0.9995 = 99.95%)
    window: "5m" | "1h" | "1d"; // 집계 기간
    source: "telemetry" | "trace" | "queue"; // 관측 소스
    alertThreshold: number; // 경보 기준
    lastBreaches: Timestamp[]; // 최근 위반 기록
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * SLO Watchdog - 자동 경보
 * 매 5분마다 실행
 */
export const sloWatchdog = onSchedule(
    {
        schedule: "every 5 minutes",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("🔍 SLO Watchdog 실행 중...");

            // SLO 정의 조회
            const slosSnap = await db.collection("slo").get();

            if (slosSnap.empty) {
                logger.info("⚠️ SLO 정의가 없습니다.");
                return;
            }

            // 최신 텔레메트리 데이터 조회
            const telemetrySnap = await db
                .collection("telemetryDaily")
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();

            if (telemetrySnap.empty) {
                logger.info("⚠️ 텔레메트리 데이터가 없습니다.");
                return;
            }

            const today = telemetrySnap.docs[0].data() as any;

            // 각 SLO 검사
            for (const sloDoc of slosSnap.docs) {
                const slo = sloDoc.data() as SLO;
                const metric = sloDoc.id;

                let currentValue: number | null = null;
                let isBreach = false;

                // 메트릭별 값 조회
                switch (metric) {
                    case "errorRate":
                        currentValue = today.errorRate || 0;
                        isBreach = currentValue > slo.alertThreshold;
                        break;
                    case "graphAskP95":
                        currentValue = today.p95 || 0;
                        isBreach = currentValue > slo.alertThreshold;
                        break;
                    case "offlineSyncSuccess":
                        currentValue = today.offlineSuccess || 0;
                        isBreach = currentValue < slo.alertThreshold;
                        break;
                    case "approvalRate":
                        currentValue = today.approvalRate || 0;
                        isBreach = currentValue < slo.alertThreshold;
                        break;
                    default:
                        logger.warn(`⚠️ 알 수 없는 메트릭: ${metric}`);
                        continue;
                }

                if (currentValue === null) {
                    continue;
                }

                // 위반 감지
                if (isBreach) {
                    const breachTime = Timestamp.now();
                    const lastBreaches = [...(slo.lastBreaches || []), breachTime].slice(-10); // 최근 10개만 유지

                    await db.collection("slo").doc(metric).update({
                        lastBreaches,
                        updatedAt: Timestamp.now(),
                    });

                    // 연속 위반 체크 (5분 이상 지속)
                    const recentBreaches = lastBreaches.filter((b) => {
                        const breachDate = b.toDate ? b.toDate() : new Date(b);
                        const minutesAgo = (Date.now() - breachDate.getTime()) / (1000 * 60);
                        return minutesAgo <= 5;
                    });

                    if (recentBreaches.length >= 5) {
                        // 경보 전송
                        const message = `🚨 SLO 위반: ${metric}\n현재 값: ${(currentValue * 100).toFixed(2)}%\n목표: ${(slo.target * 100).toFixed(2)}%\n기준: ${(slo.alertThreshold * 100).toFixed(2)}%`;

                        await notifySlack(message, metric);

                        logger.error(`🚨 SLO 위반 감지: ${metric}`, {
                            currentValue,
                            target: slo.target,
                            threshold: slo.alertThreshold,
                        });
                    }
                }
            }

            logger.info("✅ SLO Watchdog 완료");
        } catch (error: any) {
            logger.error("❌ SLO Watchdog 오류:", error);
        }
    }
);

/**
 * Slack 알림 전송
 */
async function notifySlack(message: string, metric: string): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) {
        return;
    }

    try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: message,
                channel: "#slo-alerts",
            }),
        });
    } catch (error) {
        logger.warn("⚠️ Slack 알림 실패:", error);
    }
}

/**
 * Get SLOs
 * GET /getSLOs
 */
export const getSLOs = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const slosSnap = await db.collection("slo").get();

            // 최신 텔레메트리 데이터 조회
            const telemetrySnap = await db
                .collection("telemetryDaily")
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();

            const today = telemetrySnap.empty ? {} : (telemetrySnap.docs[0].data() as any);

            const items = slosSnap.docs.map((doc) => {
                const slo = doc.data() as SLO;
                const metric = doc.id;

                let currentValue: number = 0;

                // 메트릭별 현재 값 조회
                switch (metric) {
                    case "errorRate":
                        currentValue = today.errorRate || 0;
                        break;
                    case "graphAskP95":
                        currentValue = today.p95 || 0;
                        break;
                    case "offlineSyncSuccess":
                        currentValue = today.offlineSuccess || 0;
                        break;
                    case "approvalRate":
                        currentValue = today.approvalRate || 0;
                        break;
                }

                return {
                    metric,
                    target: slo.target,
                    value: currentValue,
                    window: slo.window,
                    source: slo.source,
                    alertThreshold: slo.alertThreshold,
                    lastBreaches: (slo.lastBreaches || []).map((b) =>
                        b.toDate ? b.toDate() : b
                    ),
                };
            });

            setSecurityHeaders(res);
            res.json({ items });
        } catch (error: any) {
            logger.error("❌ SLO 조회 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Initialize Default SLOs
 * POST /initSLOs
 */
export const initSLOs = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const defaultSLOs: Record<string, Omit<SLO, "createdAt" | "updatedAt">> = {
                availability: {
                    metric: "availability",
                    target: 0.9995, // 99.95%
                    window: "1d",
                    source: "telemetry",
                    alertThreshold: 0.999, // 99.9%
                    lastBreaches: [],
                },
                errorRate: {
                    metric: "errorRate",
                    target: 0.005, // 0.5%
                    window: "5m",
                    source: "telemetry",
                    alertThreshold: 0.01, // 1%
                    lastBreaches: [],
                },
                graphAskP95: {
                    metric: "graphAskP95",
                    target: 800, // 800ms
                    window: "5m",
                    source: "trace",
                    alertThreshold: 900, // 900ms
                    lastBreaches: [],
                },
                offlineSyncSuccess: {
                    metric: "offlineSyncSuccess",
                    target: 0.995, // 99.5%
                    window: "1h",
                    source: "queue",
                    alertThreshold: 0.98, // 98%
                    lastBreaches: [],
                },
                notificationDelivery: {
                    metric: "notificationDelivery",
                    target: 0.99, // 99%
                    window: "1h",
                    source: "telemetry",
                    alertThreshold: 0.95, // 95%
                    lastBreaches: [],
                },
            };

            const now = Timestamp.now();

            for (const [metric, slo] of Object.entries(defaultSLOs)) {
                await db.collection("slo").doc(metric).set(
                    {
                        ...slo,
                        createdAt: now,
                        updatedAt: now,
                    },
                    { merge: true }
                );
            }

            logger.info("✅ 기본 SLO 초기화 완료");

            setSecurityHeaders(res);
            res.json({ ok: true, count: Object.keys(defaultSLOs).length });
        } catch (error: any) {
            logger.error("❌ SLO 초기화 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

