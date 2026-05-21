import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

/**
 * 🤖 주간 리포트 자동 생성 및 발송
 * 매주 월요일 오전 9시 자동 실행
 */
export const autoWeeklyReport = functions
    .pubsub.schedule("0 9 * * 1") // 매주 월요일 오전 9시
    .timeZone("Asia/Seoul")
    .onRun(async () => {
        console.log("🤖 [autoWeeklyReport] 주간 리포트 자동 생성 시작...");

        const generatedAt = new Date().toISOString();
        const reportDate = new Date().toISOString().split("T")[0];

        try {
            // 1️⃣ Firebase 데이터 수집
            const usersSnap = await admin.firestore().collection("users").get();
            const activeUsers = usersSnap.size;

            // Voice logs 통계
            const logsSnap = await admin.firestore()
                .collection("voice_logs")
                .orderBy("ts", "desc")
                .limit(100)
                .get();
            const totalLogs = logsSnap.size;

            console.log(`📊 데이터 수집 완료 - 사용자: ${activeUsers}명, 로그: ${totalLogs}건`);

            // 2️⃣ AI 리포트 생성 (generateWeeklyReport 호출)
            const region = process.env.FIREBASE_REGION || "asia-northeast3";
            const projectId = process.env.GCLOUD_PROJECT || "yago-vibe-spt";
            const generateReportUrl = `https://${region}-${projectId}.cloudfunctions.net/generateWeeklyReport`;

            console.log("🧠 AI 리포트 생성 호출:", generateReportUrl);

            const pdfResponse = await fetch(generateReportUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "YAGO SPORTS 주간 AI 리포트",
                    summary: `활성 사용자 수: ${activeUsers}명, 총 로그: ${totalLogs}건`,
                    generatedAt,
                }),
            });

            if (!pdfResponse.ok) {
                throw new Error(`PDF 생성 실패: ${pdfResponse.status}`);
            }

            const pdfData = await pdfResponse.json() as any;
            const pdfUrl = pdfData.pdfUrl || pdfData.url;

            console.log("✅ PDF 생성 완료:", pdfUrl);

            // 3️⃣ n8n 이메일 + Slack 전송 트리거
            const n8nWebhook = process.env.N8N_WEBHOOK_URL || "https://n8n.yagovibe.com/webhook/weekly-report";

            console.log("📧 n8n 웹훅 호출:", n8nWebhook);

            const n8nResponse = await fetch(n8nWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pdfUrl,
                    generatedAt,
                    reportDate,
                    reportType: "auto-weekly",
                    triggeredBy: "firebase-functions",
                    summary: `활성 사용자: ${activeUsers}명, 총 로그: ${totalLogs}건`,
                }),
            });

            if (!n8nResponse.ok) {
                console.warn("⚠️ n8n 웹훅 호출 실패:", n8nResponse.status);
            } else {
                console.log("✅ n8n 웹훅 호출 성공");
            }

            // 4️⃣ Firestore에 리포트 기록
            await admin.firestore().collection("auto_reports").add({
                type: "weekly",
                reportDate,
                pdfUrl,
                activeUsers,
                totalLogs,
                generatedAt,
                status: "completed",
            });

            console.log("✅ 주간 리포트 자동 생성 및 발송 완료!");

            return {
                success: true,
                pdfUrl,
                reportDate,
                activeUsers,
                totalLogs
            };
        } catch (error) {
            console.error("❌ 자동 리포트 생성 실패:", error);

            // 에러 기록
            await admin.firestore().collection("auto_reports").add({
                type: "weekly",
                reportDate,
                generatedAt,
                status: "failed",
                error: error instanceof Error ? error.message : String(error)
            });

            throw error;
        }
    });

