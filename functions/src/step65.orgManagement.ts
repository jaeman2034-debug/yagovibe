import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { getOrgContext } from "./step65.billingGuard";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/** HTTP JSON 응답용 — Admin Timestamp 등 비직렬화 값 제거 */
function deepPlainForHttp(input: unknown): unknown {
    if (input instanceof Timestamp) {
        return input.toMillis();
    }
    if (input === null || input === undefined) {
        return input;
    }
    if (Array.isArray(input)) {
        return input.map((v) => deepPlainForHttp(v));
    }
    if (typeof input === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
            if (v === undefined) continue;
            out[k] = deepPlainForHttp(v);
        }
        return out;
    }
    return input;
}

/** Firestore `plans/{planId}` 미시드 시에도 UI 수동 플랜 변경이 동작하도록 기본값 (Step65 문서와 동일) */
const DEFAULT_ORG_PLANS: Record<
    string,
    { limits: Record<string, number>; features: Record<string, boolean> }
> = {
    free: {
        limits: { rpm: 60, rpd: 1000, storageGb: 1, seats: 5, priority: 3 },
        features: { graphCopilot: false, insights: true, governance: false },
    },
    pro: {
        limits: { rpm: 120, rpd: 5000, storageGb: 10, seats: 20, priority: 2 },
        features: { graphCopilot: true, insights: true, governance: false },
    },
    enterprise: {
        limits: { rpm: 500, rpd: 50000, storageGb: 100, seats: 100, priority: 1 },
        features: { graphCopilot: true, insights: true, governance: true },
    },
};

function resolveOrgPlan(planId: string, firestorePlan: DocumentData | undefined): {
    limits: Record<string, unknown>;
    features: Record<string, unknown>;
} | null {
    if (firestorePlan && typeof firestorePlan === "object") {
        const p = firestorePlan as { limits?: Record<string, unknown>; features?: Record<string, unknown> };
        return {
            limits: p.limits || {},
            features: p.features || {},
        };
    }
    const fallback = DEFAULT_ORG_PLANS[planId];
    if (!fallback) {
        return null;
    }
    return { limits: { ...fallback.limits }, features: { ...fallback.features } };
}

/**
 * Step 65: List Orgs - 조직 목록 조회 (HTTP, 레거시·외부 연동용)
 * GET /listOrgsHttp
 */
export const listOrgsHttp = onRequest(
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

            const planDoc = await db.doc(`plans/${planId}`).get();
            const plan = resolveOrgPlan(String(planId), planDoc.exists ? planDoc.data() : undefined);
            if (!plan) {
                res.status(404).json({ error: "plan_not_found" });
                return;
            }

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
 * GET /getOrgContextAPI?orgId=ORG_ID
 */
export const getOrgContextAPI = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        try {
            const orgId = String(req.query.orgId ?? "").trim();

            if (!orgId) {
                res.status(400).json({ error: "orgId is required" });
                return;
            }

            logger.info("📋 조직 컨텍스트 조회:", { orgId });

            const context = await getOrgContext(orgId);
            const merged = {
                ...context,
                org: { id: orgId, ...(context.org as Record<string, unknown>) },
            };
            const payload = deepPlainForHttp(merged);
            res.status(200).json(payload);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg === "org_not_found") {
                res.status(404).json({ error: "org_not_found" });
                return;
            }
            logger.error("❌ 조직 컨텍스트 조회 오류:", error);
            res.status(500).json({ error: msg || "internal_error" });
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

