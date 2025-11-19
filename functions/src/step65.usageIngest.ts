import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 65: Bump Usage - 사용량 증가
 */
async function bumpUsage(orgId: string, endpoint: string, tokens: number = 0): Promise<void> {
    const day = new Date().toISOString().slice(0, 10);
    const ref = db.doc(`usage/${day}/${orgId}`);

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const d: any = snap.exists ? snap.data() : { rpm: 0, rpd: 0, tokens: 0, storageBytes: 0, endpoints: {} };

        d.rpd = (d.rpd || 0) + 1;
        d.tokens = (d.tokens || 0) + tokens;
        d.endpoints = d.endpoints || {};
        d.endpoints[endpoint] = (d.endpoints[endpoint] || 0) + 1;
        d.updatedAt = Timestamp.now();

        tx.set(ref, d, { merge: true });
    });
}

/**
 * Step 65: Usage Ingest - 사용량 수집 API
 * POST /usageIngest
 * Body: { orgId: string, endpoint: string, tokens?: number }
 */
export const usageIngest = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { orgId, endpoint, tokens } = req.body || {};

            if (!orgId || !endpoint) {
                res.status(400).json({ error: "missing params: orgId and endpoint are required" });
                return;
            }

            logger.info("📊 Usage 수집:", { orgId, endpoint, tokens });

            await bumpUsage(orgId, endpoint, tokens || 0);

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ ok: true });
        } catch (error: any) {
            logger.error("❌ Usage 수집 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

