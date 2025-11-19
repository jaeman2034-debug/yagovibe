import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 60: Get Insight Reports
 * GET /getInsightReports?status=draft&teamId=SOHEUL_FC&limit=20
 */
export const getInsightReports = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const status = req.query.status as string | undefined;
            const teamId = req.query.teamId as string | undefined;
            const limit = parseInt(req.query.limit as string) || 20;

            logger.info("📋 Insight Reports 조회:", { status, teamId, limit });

            let query: any = db.collection("insightReports").orderBy("createdAt", "desc");

            // Status 필터
            if (status) {
                query = query.where("status", "==", status);
            }

            // Team 필터
            if (teamId) {
                query = query.where("teamId", "==", teamId);
            }

            const snap = await query.limit(limit).get();

            const items = snap.docs.map((doc) => {
                const data = doc.data();
                // Timestamp 변환
                if (data.createdAt?.toDate) {
                    data.createdAt = data.createdAt.toDate();
                }
                if (data.publishedAt?.toDate) {
                    data.publishedAt = data.publishedAt.toDate();
                }
                if (data.period?.start?.toDate) {
                    data.period.start = data.period.start.toDate();
                }
                if (data.period?.end?.toDate) {
                    data.period.end = data.period.end.toDate();
                }
                if (data.reviewHistory) {
                    data.reviewHistory = data.reviewHistory.map((r: any) => {
                        if (r.ts?.toDate) {
                            r.ts = r.ts.toDate();
                        }
                        return r;
                    });
                }
                if (data.comments) {
                    data.comments = data.comments.map((c: any) => {
                        if (c.createdAt?.toDate) {
                            c.createdAt = c.createdAt.toDate();
                        }
                        return c;
                    });
                }
                return {
                    id: doc.id,
                    ...data,
                };
            });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                items,
                count: items.length,
                filters: { status, teamId, limit },
            });
        } catch (error: any) {
            logger.error("❌ Insight Reports 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

