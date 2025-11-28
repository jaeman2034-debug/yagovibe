import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
// import { getStorage } from "firebase-admin/storage"; // 미사용
// Firebase Admin 초기화는 lib/firebaseAdmin.ts에서 처리됨
import { getOpenAIClient } from "./lib/openaiClient";
import fetch from "node-fetch";

const db = getFirestore();
// const bucket = getStorage().bucket(); // 미사용

const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/XXX/YYY/ZZZ";

export const predictEventTrends = onSchedule(
    {
        schedule: "0 8 * * 5", // 매주 금요일 오전 8시 예측 리포트
        timeZone: "Asia/Seoul",
    },
    async () => {
        logger.info("🤖 AI 이벤트 예측 리포트 시작");

        try {
            // 1️⃣ 최근 4주간 리포트 데이터 수집
            const snap = await db.collection("weeklyReports").orderBy("createdAt", "desc").limit(4).get();
            const reports = snap.docs.map((d) => d.data());
            // const weeks = reports.map((r) => // 미사용
            //     new Date(r.createdAt?.toDate?.() || r.createdAt).toLocaleDateString("ko-KR")
            // );
            const members = reports.map((r) => r.totalMembers || 0);
            const matches = reports.map((r) => r.totalMatches || 0);

            // 2️⃣ AI 예측 텍스트 요약 생성
            const prompt = `지난 4주간 회원 수 ${members.join(", ")} 및 경기 수 ${matches.join(", ")} 데이터를 바탕으로 다음 주 참여율 및 no-show 확률을 예측하고 요약해줘.`;

            let aiSummary = "예측 결과 없음";
            try {
                const openai = getOpenAIClient();
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                });
                aiSummary = response.choices[0].message?.content || aiSummary;
            } catch (aiError) {
                logger.warn("⚠️ AI 예측 생성 실패, 기본 요약 사용");
                aiSummary = `활동률: ${members[0]}명 회원이 ${matches[0]}건의 경기에 참여했습니다.`;
            }

            // 3️⃣ Slack 메시지 작성 (Windows에서 그래프 스킵)
            const message = {
                text: `🤖 *YAGO VIBE AI 이벤트 예측 리포트*\n\n${aiSummary}\n\n📊 최근 트렌드: 회원 ${members[0]}명, 경기 ${matches[0]}건`,
            };

            // 4️⃣ Slack 전송
            await fetch(SLACK_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(message),
            });

            logger.info("✅ AI 이벤트 예측 리포트 완료");
        } catch (err) {
            logger.error("❌ AI 이벤트 예측 리포트 오류", err);
        }
    }
);

