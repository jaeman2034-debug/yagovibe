import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import OpenAI from "openai";

// Firebase Admin 초기화 (중복 방지)
if (!admin.apps.length) {
    admin.initializeApp();
}

const SLACK_WEBHOOK = functions.config().slack?.webhook || "";
const OPENAI_API_KEY = functions.config().openai?.key || "";

// OpenAI 클라이언트 초기화
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

export const vibeReport = functions.https.onRequest(async (req, res) => {
    // CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    const { period = "thisweek", create } = req.query;

    try {
        // Firestore 통계 수집
        const users = (await admin.firestore().collection("users").get()).size;
        const teams = (await admin.firestore().collection("teams").get()).size;
        const events = (await admin.firestore().collection("events").get()).size;
        const facilities = (await admin.firestore().collection("facilities").get()).size;

        // OpenAI AI 요약 생성
        let message = "";
        if (openai) {
            try {
                const prompt = `다음은 YAGO SPORTS 스포츠 플랫폼의 현재 운영 지표입니다:
- 회원 수: ${users}명
- 팀 수: ${teams}개
- 이벤트 수: ${events}건
- 시설 수: ${facilities}곳

${period === "thisweek" ? "이번 주" : "지난 주"} 리포트를 한국어로 3-4줄로 요약해줘.`;

                const aiResponse = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                });

                message = aiResponse.choices[0].message.content || "AI 요약 생성 실패";
            } catch (aiError) {
                console.error("⚠️ OpenAI 요약 실패:", aiError);
                // AI 실패 시 기본 메시지 사용
                message = `
📊 *YAGO SPORTS ${period === "thisweek" ? "이번 주" : "지난 주"} 리포트*
• 회원 수: ${users}명
• 팀 수: ${teams}개
• 이벤트 수: ${events}건
• 시설 수: ${facilities}곳
`.trim();
            }
        } else {
            message = `
📊 *YAGO SPORTS ${period === "thisweek" ? "이번 주" : "지난 주"} 리포트*
• 회원 수: ${users}명
• 팀 수: ${teams}개
• 이벤트 수: ${events}건
• 시설 수: ${facilities}곳
`.trim();
        }

        const data = { users, teams, events, facilities };

        // ✅ Firestore 로그 저장
        await admin.firestore().collection("logs").add({
            type: create === "true" ? "createReport" : "getReport",
            period,
            timestamp: Date.now(),
            result: true,
            message: message,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("✅ Firestore 로그 저장 완료");

        // 🔹 Slack에도 동시에 전송 (선택)
        if (SLACK_WEBHOOK) {
            try {
                await fetch(SLACK_WEBHOOK, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: message }),
                });
                console.log("✅ Slack 알림 전송 완료");
            } catch (slackErr) {
                console.warn("⚠️ Slack 전송 실패:", slackErr);
                // Slack 실패해도 계속 진행
            }
        }

        // 🔹 웹 호출 응답
        res.status(200).json({
            success: true,
            message,
            period,
            data,
        });
    } catch (err) {
        console.error("❌ vibeReport 에러:", err);
        res.status(500).json({
            success: false,
            error: String(err)
        });
    }
});
