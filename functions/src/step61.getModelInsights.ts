import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 61: Get Model Insights - 모델 인사이트 조회 API
 * GET /getModelInsights?limit=20
 */
export const getModelInsights = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const limit = parseInt(req.query.limit as string) || 20;

            logger.info("📊 Model Insights 조회:", { limit });

            const snap = await db
                .collection("modelInsights")
                .orderBy("createdAt", "desc")
                .limit(limit)
                .get();

            const items = snap.docs.map((doc) => {
                const data = doc.data();
                // Timestamp 변환
                if (data.createdAt?.toDate) {
                    data.createdAt = data.createdAt.toDate();
                }
                return {
                    id: doc.id,
                    ...data,
                };
            });

            // 통계 계산
            const totalFeedback = await db.collection("feedbackDataset").count().get();
            const totalInsights = snap.size;

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                items,
                count: items.length,
                stats: {
                    totalFeedback: totalFeedback.data().count,
                    totalInsights,
                },
            });
        } catch (error: any) {
            logger.error("❌ Model Insights 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 61: Get Feedback Dataset Stats - 피드백 데이터셋 통계
 * GET /getFeedbackStats
 */
export const getFeedbackStats = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            logger.info("📊 Feedback Stats 조회");

            // 승인/반려 통계
            const approvedSnap = await db
                .collection("feedbackDataset")
                .where("decision", "==", "approved")
                .count()
                .get();

            const rejectedSnap = await db
                .collection("feedbackDataset")
                .where("decision", "==", "rejected")
                .count()
                .get();

            const totalSnap = await db.collection("feedbackDataset").count().get();

            const total = totalSnap.data().count;
            const approved = approvedSnap.data().count;
            const rejected = rejectedSnap.data().count;

            const approvalRate = total > 0 ? approved / total : 0;

            // 최근 7일 피드백
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentSnap = await db
                .collection("feedbackDataset")
                .where("updatedAt", ">=", sevenDaysAgo)
                .count()
                .get();

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                total,
                approved,
                rejected,
                approvalRate,
                feedbackDensity: recentSnap.data().count, // 최근 7일 피드백 건수
            });
        } catch (error: any) {
            logger.error("❌ Feedback Stats 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

