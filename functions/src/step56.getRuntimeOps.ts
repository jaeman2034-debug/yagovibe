import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 56: Get Runtime Ops API
 * runtimeOps 정책 조회 (차단된 명령 목록)
 * GET /getRuntimeOps
 */
export const getRuntimeOps = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            logger.info("📊 RuntimeOps 조회");

            const doc = await db.doc("policies/runtimeOps").get();
            const data = doc.data() || { disabled: [], updatedAt: null, reason: null };

            // Timestamp 변환
            if (data.updatedAt?.toDate) {
                data.updatedAt = {
                    seconds: Math.floor(data.updatedAt.toDate().getTime() / 1000),
                    nanoseconds: 0,
                };
            } else if (data.updatedAt?._seconds) {
                data.updatedAt = {
                    seconds: data.updatedAt._seconds,
                    nanoseconds: data.updatedAt._nanoseconds || 0,
                };
            }

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json(data);
        } catch (error: any) {
            logger.error("❌ RuntimeOps 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

