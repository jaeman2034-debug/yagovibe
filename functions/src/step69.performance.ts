import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setSecurityHeaders } from "./step69.securityHeaders";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 69: Performance Budget Check - 성능 예산 검증
 * GET /performanceCheck
 */
export const performanceCheck = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            // 최근 24시간 텔레메트리 데이터 조회
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const qs = await db
                .collection("telemetryDaily")
                .where("createdAt", ">=", yesterday)
                .get();

            const budgets: any = {
                api: { p95: 900, errorRate: 0.01, status: "ok" },
                kg: { avg: 600, cacheHitRate: 0.6, status: "ok" },
            };

            const violations: string[] = [];

            // API 성능 예산 검사
            qs.docs.forEach((doc) => {
                const data = doc.data();
                if (data.p95 > 900) {
                    violations.push(`API p95 > 900ms (현재: ${data.p95}ms)`);
                    budgets.api.status = "violated";
                }
                if (data.errorRate > 0.01) {
                    violations.push(`Error rate > 1% (현재: ${(data.errorRate * 100).toFixed(1)}%)`);
                    budgets.api.status = "violated";
                }
            });

            // KG 질의 성능 검사 (예시)
            // TODO: 실제 Neo4j 쿼리 성능 데이터 조회

            setSecurityHeaders(res);

            res.json({
                ok: violations.length === 0,
                budgets,
                violations,
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            logger.error("❌ 성능 예산 검증 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

