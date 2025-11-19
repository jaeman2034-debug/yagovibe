import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { setSecurityHeaders } from "./step69.securityHeaders";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 69: Health Check - 헬스체크 엔드포인트
 * GET /health
 */
export const health = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const startTime = Date.now();

            // Firestore 연결 확인
            let firestoreOk = false;
            try {
                await db.collection("_health").limit(1).get();
                firestoreOk = true;
            } catch (error) {
                logger.warn("⚠️ Firestore 연결 실패:", error);
            }

            // Storage 연결 확인 (선택)
            let storageOk = false;
            try {
                const storage = getStorage();
                await storage.bucket().getMetadata();
                storageOk = true;
            } catch (error) {
                logger.warn("⚠️ Storage 연결 실패:", error);
            }

            // Neo4j 연결 확인 (선택, 환경 변수에 NEO4J_URI가 있는 경우)
            let neo4jOk = true; // 기본값: 선택적
            if (process.env.NEO4J_URI) {
                try {
                    // TODO: 실제 Neo4j 연결 테스트
                    // const { run } = require('./kg/neo4j');
                    // await run('RETURN 1 AS ok');
                    neo4jOk = true;
                } catch (error) {
                    logger.warn("⚠️ Neo4j 연결 실패:", error);
                    neo4jOk = false;
                }
            }

            const responseTime = Date.now() - startTime;
            const isHealthy = firestoreOk && storageOk && neo4jOk;

            const healthData = {
                ok: isHealthy,
                version: process.env.APP_VER || "0.0.0",
                timestamp: new Date().toISOString(),
                responseTime: `${responseTime}ms`,
                services: {
                    firestore: firestoreOk ? "ok" : "error",
                    storage: storageOk ? "ok" : "error",
                    neo4j: neo4jOk ? "ok" : "error",
                },
                region: "asia-northeast3",
            };

            setSecurityHeaders(res);

            if (isHealthy) {
                res.status(200).json(healthData);
            } else {
                res.status(503).json(healthData);
            }
        } catch (error: any) {
            logger.error("❌ 헬스체크 오류:", error);
            setSecurityHeaders(res);
            res.status(503).json({
                ok: false,
                error: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    }
);

/**
 * Step 69: Readiness Check - 준비 상태 확인
 * GET /ready
 */
export const ready = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            // 필수 종속성만 확인
            const firestoreOk = await db
                .collection("_health")
                .limit(1)
                .get()
                .then(() => true)
                .catch(() => false);

            const isReady = firestoreOk;

            setSecurityHeaders(res);

            if (isReady) {
                res.status(200).json({
                    ready: true,
                    timestamp: new Date().toISOString(),
                });
            } else {
                res.status(503).json({
                    ready: false,
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (error: any) {
            logger.error("❌ 준비 상태 확인 오류:", error);
            setSecurityHeaders(res);
            res.status(503).json({
                ready: false,
                error: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    }
);

