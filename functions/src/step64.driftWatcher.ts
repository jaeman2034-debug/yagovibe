import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 64: Drift Watcher - 정책 드리프트 탐지
 * 매시간 실행
 */
export const driftWatcher = onSchedule(
    {
        schedule: "every 1 hours",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("🔍 Drift Watcher 시작");

            const desiredDoc = await db.doc("policies/default-governance").get();
            if (!desiredDoc.exists) {
                logger.info("⚠️ 정책 문서가 없습니다.");
                return;
            }

            const desired = desiredDoc.data() as any;
            const runtimeDoc = await db.doc("policies/runtimeOps").get();
            const runtime = runtimeDoc.exists ? runtimeDoc.data() : null;

            const drift: string[] = [];

            // 1) onBreach 액션이 정의되어 있는데 runtimeOps가 없는 경우
            const onBreachActions = desired?.actions?.onBreach || [];
            if (onBreachActions.length > 0 && !runtime) {
                drift.push("runtime_missing");
            }

            // 2) onBreach에서 blockOps가 정의되어 있는데 runtimeOps.disabled에 없는 경우
            for (const action of onBreachActions) {
                if (action.do?.includes("blockOps")) {
                    const blockOps = action.blockOps || [];
                    const disabled = runtime?.disabled || [];
                    const missing = blockOps.filter((op: string) => !disabled.includes(op));
                    if (missing.length > 0) {
                        drift.push(`blockOps_missing:${missing.join(",")}`);
                    }
                }
            }

            // 3) onRecover에서 unblockOps가 정의되어 있는데 runtimeOps.disabled에 여전히 있는 경우
            const onRecoverActions = desired?.actions?.onRecover || [];
            for (const action of onRecoverActions) {
                if (action.do?.includes("unblockOps")) {
                    const unblockOps = action.unblockOps || [];
                    const disabled = runtime?.disabled || [];
                    const stillBlocked = unblockOps.filter((op: string) => disabled.includes(op));
                    if (stillBlocked.length > 0) {
                        drift.push(`unblockOps_still_blocked:${stillBlocked.join(",")}`);
                    }
                }
            }

            // 4) rollout 상태와 정책 일치 여부
            const rolloutDoc = await db.doc("policies/rollout").get();
            const rollout = rolloutDoc.exists ? rolloutDoc.data() : null;
            if (rollout && desired.rollout) {
                const currentPercent = rollout.percent || 0;
                const currentIdx = rollout.idx ?? -1;
                const stages = desired.rollout.stages || [];
                const expectedStage = stages[currentIdx];
                if (expectedStage && expectedStage.percent !== currentPercent) {
                    drift.push(`rollout_percent_mismatch:expected=${expectedStage.percent},actual=${currentPercent}`);
                }
            }

            if (drift.length > 0) {
                logger.warn("⚠️ 정책 드리프트 감지:", drift);

                // 알림 생성
                await db.collection("alerts").add({
                    createdAt: Timestamp.now(),
                    type: "policy_drift",
                    messages: drift,
                    severity: "medium",
                });

                // Slack 알림 (선택)
                if (process.env.SLACK_WEBHOOK_URL) {
                    try {
                        const slackMessage =
                            `⚠️ Policy Drift Detected\n\n` +
                            `Drifts:\n${drift.map((d) => `• ${d}`).join("\n")}\n\n` +
                            `Please review and align policies.`;

                        await fetch(process.env.SLACK_WEBHOOK_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: slackMessage }),
                        });
                    } catch (error) {
                        logger.warn("⚠️ Slack 알림 실패:", error);
                    }
                }
            } else {
                logger.info("✅ 정책 드리프트 없음");
            }
        } catch (error: any) {
            logger.error("❌ Drift Watcher 오류:", error);
        }
    }
);

