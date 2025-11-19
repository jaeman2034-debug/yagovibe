import { onSchedule } from "firebase-functions/v2/scheduler";
import fetch from "node-fetch";

/**
 * 🩺 시스템 상태 점검 함수
 * 6시간마다 자동 실행
 * 앱 상태 확인 후 Slack 경고 전송
 */
export const vibeHealthCheck = onSchedule(
    {
        schedule: "0 */6 * * *", // 6시간마다 실행
        timeZone: "Asia/Seoul",
    },
    async () => {
        try {
            console.log("🩺 [HealthCheck] 시스템 상태 점검 시작");

            const appUrl = process.env.FUNCTIONS_URL || "https://yago-vibe-spt.web.app";
            const healthUrl = `${appUrl}/api/health`;

            const res = await fetch(healthUrl);

            if (res.ok) {
                console.log("✅ VIBE 시스템 정상 작동 중");

                // 정상 상태도 Firestore에 기록
                const admin = await import("firebase-admin");
                await admin.firestore().collection("health_checks").add({
                    status: "ok",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                throw new Error(`HTTP Status: ${res.status}`);
            }
        } catch (err) {
            console.error("⚠️ 시스템 점검 실패:", err);

            // 실패 시 Slack 경고 전송
            const slackWebhook = process.env.SLACK_WEBHOOK_URL;
            if (slackWebhook) {
                try {
                    await fetch(slackWebhook, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: `🚨 *YAGO VIBE HealthCheck 경고!*\n\n오류: ${err}\n시간: ${new Date().toISOString()}`,
                        }),
                    });
                } catch (slackErr) {
                    console.error("❌ Slack 전송 실패:", slackErr);
                }
            }

            // 에러 로그 Firestore 저장
            try {
                const admin = await import("firebase-admin");
                await admin.firestore().collection("health_checks").add({
                    status: "error",
                    error: String(err),
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
            } catch (logErr) {
                console.error("❌ 에러 로그 저장 실패:", logErr);
            }
        }
    }
);

