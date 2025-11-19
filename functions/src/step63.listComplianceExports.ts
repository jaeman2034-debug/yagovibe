import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 63: List Compliance Exports - 감사 번들 목록 조회
 * GET /listComplianceExports?uid=USER_UID&limit=20
 */
export const listComplianceExports = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const uid = req.query.uid as string | undefined;
            const limit = parseInt(req.query.limit as string) || 20;

            logger.info("📋 Compliance Exports 조회:", { uid, limit });

            let query: any = db.collection("complianceExports").orderBy("createdAt", "desc");

            if (uid) {
                query = query.where("uid", "==", uid);
            }

            const snap = await query.limit(limit).get();

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

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                items,
                count: items.length,
                filters: { uid, limit },
            });
        } catch (error: any) {
            logger.error("❌ Compliance Exports 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 63: List DSAR Requests - DSAR 요청 목록 조회
 * GET /listDSARRequests?uid=USER_UID&status=pending|done
 */
export const listDSARRequests = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const uid = req.query.uid as string | undefined;
            const status = req.query.status as string | undefined;
            const limit = parseInt(req.query.limit as string) || 20;

            logger.info("📋 DSAR Requests 조회:", { uid, status, limit });

            let query: any = db.collection("dsarRequests").orderBy("createdAt", "desc");

            if (uid) {
                query = query.where("uid", "==", uid);
            }

            if (status) {
                query = query.where("status", "==", status);
            }

            const snap = await query.limit(limit).get();

            const items = snap.docs.map((doc) => {
                const data = doc.data();
                // Timestamp 변환
                if (data.createdAt?.toDate) {
                    data.createdAt = data.createdAt.toDate();
                }
                if (data.completedAt?.toDate) {
                    data.completedAt = data.completedAt.toDate();
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
                filters: { uid, status, limit },
            });
        } catch (error: any) {
            logger.error("❌ DSAR Requests 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

