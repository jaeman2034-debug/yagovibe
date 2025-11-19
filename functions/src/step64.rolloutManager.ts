import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeAuditLog } from "./trace/traceLogger";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 64: Rollout Advance - 점진 배포/회귀 자동 조절
 * POST /rolloutAdvance
 * Body: { approvedBy?: string }
 */
export const rolloutAdvance = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { approvedBy } = req.body || {};

            logger.info("🚀 Rollout Advance 시작");

            // 정책 로드
            const polDoc = await db.doc("policies/default-governance").get();
            if (!polDoc.exists) {
                res.status(404).json({ error: "policy not found" });
                return;
            }

            const pol = polDoc.data() as any;
            const stages = pol.rollout?.stages || [];

            if (stages.length === 0) {
                res.status(400).json({ error: "no rollout stages defined" });
                return;
            }

            // 현재 단계 조회
            const rolloutDoc = await db.doc("policies/rollout").get();
            const current = rolloutDoc.exists ? rolloutDoc.data() : { percent: 0, idx: -1, updatedAt: null };

            const currentIdx = (current as any).idx ?? -1;

            // 회귀 검사: governance/{today}
            const govDoc = await db.collection("governance").orderBy("date", "desc").limit(1).get();
            let passed = true;

            if (!govDoc.empty) {
                const gov = govDoc.docs[0].data();
                const thresholds = pol.thresholds || {};

                // passRate 임계값 검사
                const passRateThreshold = thresholds.passRate;
                if (passRateThreshold) {
                    const currentPassRate = gov.passRate ?? 1;
                    const targetPassRate = passRateThreshold.value ?? 0.9;
                    const op = passRateThreshold.op || ">=";

                    if (op === ">=" && currentPassRate < targetPassRate) {
                        passed = false;
                    } else if (op === ">" && currentPassRate <= targetPassRate) {
                        passed = false;
                    }
                }

                // regressionCount 임계값 검사
                const regressionThreshold = thresholds.regressionCount;
                if (regressionThreshold) {
                    const currentRegressions = gov.regressionCount ?? 0;
                    const targetRegressions = regressionThreshold.value ?? 3;
                    const op = regressionThreshold.op || "<=";

                    if (op === "<=" && currentRegressions > targetRegressions) {
                        passed = false;
                    } else if (op === "<" && currentRegressions >= targetRegressions) {
                        passed = false;
                    }
                }
            }

            if (!passed) {
                logger.warn("⚠️ 회귀 감지, 롤아웃 중단");
                res.status(409).json({
                    error: "regression_detected",
                    message: "Quality metrics below threshold",
                });
                return;
            }

            // 다음 단계 계산
            const nextIdx = Math.min(currentIdx + 1, stages.length - 1);
            const nextStage = stages[nextIdx] || { percent: 100 };

            // 최소 시간 체크
            if (current.updatedAt) {
                const lastUpdate = current.updatedAt.toDate ? current.updatedAt.toDate() : new Date(current.updatedAt);
                const minHours = nextStage.minHours || 0;
                const hoursSince = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

                if (hoursSince < minHours) {
                    res.status(409).json({
                        error: "min_hours_not_met",
                        message: `Must wait ${minHours} hours before advancing. ${hoursSince.toFixed(1)} hours elapsed.`,
                    });
                    return;
                }
            }

            // 롤아웃 상태 업데이트
            await db.doc("policies/rollout").set(
                {
                    idx: nextIdx,
                    percent: nextStage.percent,
                    updatedAt: Timestamp.now(),
                    approvedBy: approvedBy || "system",
                },
                { merge: true }
            );

            // 감사 로그 기록
            await writeAuditLog({
                actor: { uid: approvedBy || "system", role: "admin" },
                action: "rollout_advance",
                subject: { policyId: pol.id },
                input: { from: currentIdx, to: nextIdx, percent: nextStage.percent },
                output: { success: true, newPercent: nextStage.percent },
                policy: { matchedRules: ["rollout"], risk: "med" },
                pii: { redacted: false, fields: [] },
                consent: { basis: "legitimate", scope: ["ops"] },
            });

            logger.info("✅ Rollout Advance 완료:", {
                from: currentIdx,
                to: nextIdx,
                percent: nextStage.percent,
            });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                ok: true,
                percent: nextStage.percent,
                idx: nextIdx,
                totalStages: stages.length,
            });
        } catch (error: any) {
            logger.error("❌ Rollout Advance 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

