import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getOrgContext } from "./step65.billingGuard";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 65: List Orgs - 조직 목록 조회
 * GET /listOrgs
 */
export const listOrgs = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            logger.info("📋 조직 목록 조회");

            const qs = await db.collection("orgs").get();

            const items = qs.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                };
            });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ items });
        } catch (error: any) {
            logger.error("❌ 조직 목록 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 65: Set Org Plan - 조직 요금제 설정
 * POST /setOrgPlan
 * Body: { orgId: string, planId: string }
 */
export const setOrgPlan = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { orgId, planId } = req.body || {};

            if (!orgId || !planId) {
                res.status(400).json({ error: "missing params: orgId and planId are required" });
                return;
            }

            logger.info("📋 조직 요금제 설정:", { orgId, planId });

            // 요금제 정보 조회
            const planDoc = await db.doc(`plans/${planId}`).get();
            if (!planDoc.exists) {
                res.status(404).json({ error: "plan_not_found" });
                return;
            }

            const plan = planDoc.data() as any;

            // 조직 업데이트
            await db.doc(`orgs/${orgId}`).set(
                {
                    planId,
                    limits: plan.limits || {},
                    features: plan.features || {},
                    updatedAt: Timestamp.now(),
                },
                { merge: true }
            );

            logger.info("✅ 조직 요금제 설정 완료:", { orgId, planId });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ ok: true, orgId, planId });
        } catch (error: any) {
            logger.error("❌ 조직 요금제 설정 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 65: Get Org Context - 조직 컨텍스트 조회 API
 * GET /getOrgContext?orgId=ORG_ID
 */
export const getOrgContextAPI = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const orgId = req.query.orgId as string;

            if (!orgId) {
                res.status(400).json({ error: "orgId is required" });
                return;
            }

            logger.info("📋 조직 컨텍스트 조회:", { orgId });

            const context = await getOrgContext(orgId);

            // Timestamp 변환
            if (context.org.updatedAt?.toDate) {
                context.org.updatedAt = context.org.updatedAt.toDate();
            }

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json(context);
        } catch (error: any) {
            logger.error("❌ 조직 컨텍스트 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 65: Get Usage Stats - 사용량 통계 조회
 * GET /getUsageStats?orgId=ORG_ID&days=7
 */
export const getUsageStats = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const orgId = req.query.orgId as string;
            const days = parseInt(req.query.days as string) || 7;

            if (!orgId) {
                res.status(400).json({ error: "orgId is required" });
                return;
            }

            logger.info("📊 사용량 통계 조회:", { orgId, days });

            const stats: any[] = [];
            const today = new Date();

            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const day = date.toISOString().slice(0, 10);

                const doc = await db.doc(`usage/${day}/${orgId}`).get();
                if (doc.exists) {
                    const data = doc.data();
                    stats.push({
                        day,
                        ...data,
                    });
                }
            }

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ orgId, stats, days });
        } catch (error: any) {
            logger.error("❌ 사용량 통계 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

