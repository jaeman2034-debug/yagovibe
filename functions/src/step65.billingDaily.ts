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
 * Step 65: Billing Daily - 일일 과금 계산
 * 매일 00:10에 실행
 */
export const billingDaily = onSchedule(
    {
        schedule: "every day 00:10",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("💰 Billing Daily 시작");

            // 전날 데이터 처리
            const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const dayRef = db.collection(`usage/${day}`);

            const qs = await dayRef.get();

            if (qs.empty) {
                logger.info("⚠️ 사용량 데이터가 없습니다.");
                return;
            }

            const unitPrice = parseFloat(process.env.TOKEN_UNIT_PRICE || "0.0005"); // 토큰 단가
            let totalAmount = 0;
            let totalTokens = 0;
            let processedCount = 0;

            for (const doc of qs.docs) {
                const orgId = doc.id;
                const u: any = doc.data();

                const tokens = u.tokens || 0;
                const amount = Math.round(tokens * unitPrice * 100) / 100;

                // 과금 기록
                await db.collection("billingDaily").add({
                    orgId,
                    day,
                    tokens,
                    amount,
                    endpoints: u.endpoints || {},
                    rpd: u.rpd || 0,
                    createdAt: Timestamp.now(),
                });

                totalAmount += amount;
                totalTokens += tokens;
                processedCount++;

                logger.info("💰 과금 기록:", { orgId, tokens, amount });
            }

            // 요약 통계
            await db.collection("billingSummary").doc(day).set({
                day,
                totalOrgs: processedCount,
                totalTokens,
                totalAmount,
                processedAt: Timestamp.now(),
            });

            // Slack 알림 (선택)
            if (process.env.SLACK_WEBHOOK_URL) {
                try {
                    const slackMessage =
                        `💰 Daily Billing Summary (${day})\n\n` +
                        `처리된 조직: ${processedCount}개\n` +
                        `총 토큰: ${totalTokens.toLocaleString()}\n` +
                        `총 금액: $${totalAmount.toFixed(2)}`;

                    await fetch(process.env.SLACK_WEBHOOK_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: slackMessage }),
                    });
                } catch (error) {
                    logger.warn("⚠️ Slack 알림 실패:", error);
                }
            }

            logger.info("✅ Billing Daily 완료:", {
                day,
                processedCount,
                totalTokens,
                totalAmount,
            });
        } catch (error: any) {
            logger.error("❌ Billing Daily 오류:", error);
        }
    }
);

