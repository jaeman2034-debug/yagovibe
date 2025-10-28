import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

initializeApp();
const db = getFirestore();

const N8N_WEBHOOK_URL = "https://n8n.yagovibe.com/webhook/ai-operation";

export const dispatchAIReport = onSchedule(
    {
        schedule: "0 10 * * 1", // 매주 월요일 10시
        timeZone: "Asia/Seoul",
    },
    async () => {
        logger.info("📡 n8n 자동화 루틴 트리거 시작");

        try {
            const snap = await db
                .collection("weeklyReports")
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();

            if (snap.empty) {
                logger.warn("⚠️ 최신 리포트가 없습니다.");
                return;
            }

            const latest = snap.docs[0].data();
            const payload = {
                reportType: "AI 주간 운영 리포트",
                summary: latest.summary || "요약 없음",
                chartUrl: `https://storage.googleapis.com/YOUR_BUCKET/${latest.storagePath}`,
            };

            await fetch(N8N_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            logger.info("✅ n8n 루틴 전송 완료");
        } catch (err) {
            logger.error("❌ n8n 전송 실패", err);
        }
    }
);

