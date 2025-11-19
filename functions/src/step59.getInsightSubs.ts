import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 59: Get Insight Subscriptions
 * GET /getInsightSubs
 */
export const getInsightSubs = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            logger.info("📋 Insight 구독 조회");

            const snap = await db.collection("insightSubs").get();
            const items = snap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ items, count: items.length });
        } catch (error: any) {
            logger.error("❌ Insight 구독 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

