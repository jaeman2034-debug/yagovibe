import { onSchedule } from "firebase-functions/v2/scheduler";
import fetch from "node-fetch";

/**
 * 🤖 주간 자동 리포트 생성 함수
 * 매주 월요일 오전 9시(KST) 자동 실행
 * Cloud Scheduler 트리거 사용
 */
export const vibeAutoReport = onSchedule(
    {
        schedule: "0 9 * * 1", // 매주 월요일 09:00 (KST)
        timeZone: "Asia/Seoul",
    },
    async () => {
        try {
            console.log("🚀 [vibeAutoReport] 시작: 주간 리포트 자동 생성");

            // 호스팅된 앱의 API 호출
            const appUrl = process.env.FUNCTIONS_URL || "https://yago-vibe-spt.web.app";
            const apiUrl = `${appUrl}/api/generateReport`;

            console.log("Profile API URL:", apiUrl);

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as any;
            console.log("✅ 자동 리포트 생성 완료:", data.url || "no URL");

            // Firestore에 로그 기록
            const admin = await import("firebase-admin");
            await admin.firestore().collection("auto_reports").add({
                success: true,
                url: data.url || "N/A",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        } catch (err) {
            console.error("❌ 자동 리포트 생성 실패:", err);

            // 에러 로그도 Firestore에 기록
            try {
                const admin = await import("firebase-admin");
                await admin.firestore().collection("auto_reports").add({
                    success: false,
                    error: String(err),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } catch (logErr) {
                console.error("❌ 에러 로그 기록 실패:", logErr);
            }
        }
    }
);

