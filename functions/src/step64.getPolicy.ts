import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 64: Get Policy - 정책 조회
 * GET /getPolicy?id=default-governance
 */
export const getPolicy = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const id = (req.query.id as string) || "default-governance";

            logger.info("📋 Policy 조회:", { id });

            const doc = await db.doc(`policies/${id}`).get();

            if (!doc.exists) {
                res.status(404).json({ error: "policy not found" });
                return;
            }

            const data = doc.data();
            // Timestamp 변환
            if (data?.compiledAt?.toDate) {
                data.compiledAt = data.compiledAt.toDate();
            }

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json(data);
        } catch (error: any) {
            logger.error("❌ Policy 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 64: Get Rollout - 롤아웃 상태 조회
 * GET /getRollout
 */
export const getRollout = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            logger.info("📋 Rollout 조회");

            const doc = await db.doc("policies/rollout").get();

            const data = doc.exists ? doc.data() : { percent: 0, idx: -1 };
            // Timestamp 변환
            if (data?.updatedAt?.toDate) {
                data.updatedAt = data.updatedAt.toDate();
            }

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json(data || {});
        } catch (error: any) {
            logger.error("❌ Rollout 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 64: Get Runtime Ops - 런타임 운영 상태 조회
 * GET /getRuntimeOps
 */
export const getRuntimeOps = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            logger.info("📋 Runtime Ops 조회");

            const doc = await db.doc("policies/runtimeOps").get();

            const data = doc.exists ? doc.data() : { disabled: [] };
            // Timestamp 변환
            if (data?.updatedAt?.toDate) {
                data.updatedAt = data.updatedAt.toDate();
            }

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json(data || { disabled: [] });
        } catch (error: any) {
            logger.error("❌ Runtime Ops 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

