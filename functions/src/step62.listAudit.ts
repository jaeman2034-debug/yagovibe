import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 62: List Audit Logs - 감사 로그 목록 조회
 * GET /listAudit?limit=100&teamId=TEAM_ID&action=ACTION
 */
export const listAudit = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const limit = parseInt(req.query.limit as string) || 100;
            const teamId = req.query.teamId as string | undefined;
            const action = req.query.action as string | undefined;
            const actorUid = req.query.actorUid as string | undefined;

            logger.info("📋 감사 로그 목록 조회:", { limit, teamId, action, actorUid });

            let query: any = db.collection("auditLogs").orderBy("ts", "desc");

            // 필터 적용
            if (teamId) {
                query = query.where("subject.teamId", "==", teamId);
            }

            if (action) {
                query = query.where("action", "==", action);
            }

            if (actorUid) {
                query = query.where("actor.uid", "==", actorUid);
            }

            const snap = await query.limit(limit).get();

            const items = snap.docs.map((doc) => {
                const data = doc.data();
                // Timestamp 변환
                if (data.ts?.toDate) {
                    data.ts = data.ts.toDate();
                }
                if (data.integrity?.createdAt?.toDate) {
                    data.integrity.createdAt = data.integrity.createdAt.toDate();
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
                filters: { limit, teamId, action, actorUid },
            });
        } catch (error: any) {
            logger.error("❌ 감사 로그 목록 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

