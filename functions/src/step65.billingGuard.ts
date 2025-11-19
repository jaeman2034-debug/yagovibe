import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

type Limits = {
    rpm: number;
    rpd: number;
    storageGb: number;
    seats: number;
    priority: number;
};

type OrgContext = {
    org: any;
    plan: any;
    features: { [key: string]: boolean };
    limits: Limits;
};

/**
 * Step 65: Get Org Context - 조직 컨텍스트 조회
 * 조직, 요금제, 기능, 제한 정보를 통합 조회
 */
export async function getOrgContext(orgId: string): Promise<OrgContext> {
    const orgDoc = await db.doc(`orgs/${orgId}`).get();
    if (!orgDoc.exists) {
        throw new Error("org_not_found");
    }

    const org = orgDoc.data() as any;
    const planId = org.planId || "free";

    // 요금제 정보 조회
    const planDoc = await db.doc(`plans/${planId}`).get();
    const plan = planDoc.exists ? planDoc.data() : { limits: {}, features: {} };

    // 기능 병합: plan.features + org.features
    const features = { ...(plan.features || {}), ...(org.features || {}) };

    // 제한 병합: plan.limits + org.limits
    const limits: Limits = {
        rpm: plan.limits?.rpm || 60,
        rpd: plan.limits?.rpd || 1000,
        storageGb: plan.limits?.storageGb || 1,
        seats: plan.limits?.seats || 5,
        priority: plan.limits?.priority || 3,
        ...(org.limits || {}),
    };

    // Feature Overrides 조회
    const foDoc = await db.doc(`featureOverrides/${orgId}`).get();
    if (foDoc.exists) {
        const fo = foDoc.data() as any;
        if (fo.flags) {
            Object.assign(features, fo.flags);
        }
    }

    return { org, plan, features, limits };
}

/**
 * Step 65: Check Feature - 기능 활성화 확인
 */
export async function checkFeature(orgId: string, key: string): Promise<void> {
    try {
        const { features } = await getOrgContext(orgId);
        if (!features[key]) {
            throw new Error(`feature_disabled:${key}`);
        }
    } catch (error: any) {
        if (error.message === "org_not_found") {
            throw error;
        }
        if (error.message?.startsWith("feature_disabled")) {
            throw error;
        }
        logger.error("❌ 기능 확인 오류:", error);
        throw new Error(`feature_check_failed:${error.message}`);
    }
}

/**
 * Step 65: Rate Limit - 토큰 버킷 (분당)
 */
export async function rateLimit(orgId: string, endpoint: string, rpm: number): Promise<void> {
    const minute = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    const ref = db.doc(`ratelimits/${orgId}_${endpoint}_${minute}`);

    const snap = await ref.get();
    const data = snap.exists ? snap.data() : { c: 0 };
    const used = (data as any).c || 0;

    if (used >= rpm) {
        throw new Error("rate_limited");
    }

    await ref.set(
        {
            c: used + 1,
            orgId,
            endpoint,
            minute,
            updatedAt: Timestamp.now(),
        },
        { merge: true }
    );
}

/**
 * Step 65: Enforce Billing - 요금제 기반 제한 적용
 */
export async function enforceBilling(orgId: string, endpoint: string): Promise<void> {
    try {
        const { limits } = await getOrgContext(orgId);
        await rateLimit(orgId, endpoint, limits.rpm || 60);
    } catch (error: any) {
        if (error.message === "rate_limited") {
            throw error;
        }
        logger.error("❌ Billing 검사 오류:", error);
        throw new Error(`billing_enforcement_failed:${error.message}`);
    }
}

/**
 * Step 65: Check Quota - 일일 쿼터 확인
 */
export async function checkQuota(orgId: string, endpoint: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
        const { limits } = await getOrgContext(orgId);
        const day = new Date().toISOString().slice(0, 10);
        const ref = db.doc(`usage/${day}/${orgId}`);

        const snap = await ref.get();
        const usage = snap.exists ? snap.data() : { rpd: 0 };
        const used = (usage as any).rpd || 0;
        const remaining = Math.max(0, limits.rpd - used);

        return {
            allowed: remaining > 0,
            remaining,
        };
    } catch (error: any) {
        logger.error("❌ 쿼터 확인 오류:", error);
        return { allowed: true, remaining: Infinity }; // 오류 시 기본 허용
    }
}

