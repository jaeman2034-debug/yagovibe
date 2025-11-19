import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * reports/weekly/history/{reportId} 생성 시 n8n 웹훅으로 백업 트리거
 * 환경변수 N8N_BACKUP_WEBHOOK 이 설정되면 그 값을 사용
 */
export const backupReportToN8N = onDocumentCreated(
    {
        document: "reports/weekly/history/{reportId}",
        region: "asia-northeast3",
        timeoutSeconds: 60,
    },
    async (event) => {
        const data = event.data?.data() || {};
        const reportId = event.params.reportId as string;

        const webhookUrl = process.env.N8N_BACKUP_WEBHOOK || "https://n8n.your-domain.com/webhook/ai-report-backup";

        try {
            const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: reportId,
                    ...data,
                    backupTime: new Date().toISOString(),
                }),
            });

            const text = await res.text();
            logger.info(`✅ Backup triggered for ${reportId}`, text);
        } catch (err: any) {
            logger.error("❌ Backup failed", err.message);
        }
    }
);


