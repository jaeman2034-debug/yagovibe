import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 56: 정책 문서 초기화
 * GET /initGovernancePolicy
 * 
 * 초기 정책 문서를 생성합니다 (수동 실행용)
 */
export const initGovernancePolicy = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            logger.info("📋 Governance Policy 초기화 시작...");

            const defaultPolicy = {
                policyId: "default-governance",
                rules: [
                    {
                        metric: "passRate",
                        operator: "<",
                        value: 0.9,
                        action: "alert",
                    },
                    {
                        metric: "copilotReliability",
                        operator: "<",
                        value: 0.85,
                        action: "alert",
                    },
                    {
                        metric: "regressionCount",
                        operator: ">",
                        value: 3,
                        action: "block_risky_ops",
                    },
                    {
                        metric: "avgLatency",
                        operator: ">",
                        value: 500,
                        action: "tune_system",
                    },
                    {
                        metric: "passRate",
                        operator: "<",
                        value: 0.7,
                        action: "block_all",
                    },
                    {
                        metric: "regressionCount",
                        operator: ">",
                        value: 10,
                        action: "block_all",
                    },
                ],
                actions: {
                    alert: {
                        notifySlack: true,
                        notifyEmail: true,
                    },
                    block_risky_ops: {
                        disableIntent: ["retuning", "deploy_model", "bulk_alert"],
                    },
                    tune_system: {
                        invoke: "tuningLoop",
                    },
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await db.doc("policies/governance").set(defaultPolicy, { merge: true });

            // runtimeOps 초기화 (비어있음)
            await db.doc("policies/runtimeOps").set(
                {
                    disabled: [],
                    updatedAt: new Date(),
                    reason: null,
                },
                { merge: true }
            );

            logger.info("✅ Governance Policy 초기화 완료");

            res.json({
                success: true,
                message: "Governance Policy가 초기화되었습니다.",
                policy: defaultPolicy,
            });
        } catch (error: any) {
            logger.error("❌ Governance Policy 초기화 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

