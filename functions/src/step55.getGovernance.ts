import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 55: Get Governance API
 * Governance 데이터 조회
 * GET /getGovernance?limit=30
 */
export const getGovernance = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const limit = parseInt(req.query.limit as string) || 30;

            logger.info("📊 Governance 데이터 조회:", { limit });

            const qs = await db
                .collection("governance")
                .orderBy("date", "desc")
                .limit(limit)
                .get();

            const items = qs.docs.map((d) => {
                const data = d.data();
                // Timestamp를 Date로 변환
                if (data.lastUpdated?.toDate) {
                    data.lastUpdated = data.lastUpdated.toDate();
                } else if (data.lastUpdated?._seconds) {
                    data.lastUpdated = new Date(data.lastUpdated._seconds * 1000);
                }
                return data;
            });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                items,
                count: items.length,
                updatedAt: new Date().toISOString(),
            });
        } catch (error: any) {
            logger.error("❌ Governance 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

