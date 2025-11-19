import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * reports/weekly/history/{reportId} 생성 시 Slack으로 자동 알림 전송
 */
export const notifySlackWithTTS = onDocumentCreated(
    {
        document: "reports/weekly/history/{reportId}",
        region: "asia-northeast3",
    },
    async (event) => {
        const data = event.data?.data() || {} as any;
        const reportId = event.params.reportId as string;

        const summary = data.summary || data.highlight || "요약 없음";
        const audioURL = data.audioURL || "(없음)";
        const pdfURL = data.pdfURL || "(없음)";

        const slackWebhook = process.env.SLACK_WEBHOOK_URL || process.env.slack_webhook_url || "";
        if (!slackWebhook) {
            logger.warn("⚠️ SLACK_WEBHOOK_URL 환경변수가 설정되지 않았습니다.");
            return;
        }

        const text = `🧠 *YAGO AI 리포트 자동 생성됨*\n\n` +
            `📄 주간 요약 #${reportId}\n` +
            `🗂 PDF: ${pdfURL}\n` +
            `🔊 TTS: ${audioURL}\n\n` +
            `요약:\n${summary}`;

        try {
            const res = await fetch(slackWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            const body = await res.text();
            logger.info(`✅ Slack 알림 성공 (${reportId})`, body);
        } catch (err: any) {
            logger.error("❌ Slack 알림 실패", err.message);
        }
    }
);


