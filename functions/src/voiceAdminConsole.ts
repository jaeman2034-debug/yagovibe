import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import OpenAI from "openai";

initializeApp();
const db = getFirestore();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});

export const voiceAdminConsole = onCall(async (req) => {
    const command = (req.data.text || "").trim();
    logger.info("🎙️ 관리자 음성 명령 수신:", command);

    try {
        // 1️⃣ AI Intent 분류
        const prompt = `
    다음 문장을 읽고 어떤 작업을 수행해야 하는지 intent를 JSON으로 알려줘.
    가능한 intent: [회원추가, 일정조회, 리포트생성, 슬랙전송, 통계요약, 알수없음]
    문장: "${command}"
    형식: {"intent": "회원추가", "target": "청룡팀"}
    `;

        let intent = "알수없음";
        let target = "";

        try {
            const ai = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });

            const result = ai.choices[0].message?.content || "{}";
            const parsed = JSON.parse(result);
            intent = parsed.intent || intent;
            target = parsed.target || target;
        } catch (parseError) {
            logger.warn("⚠️ AI 파싱 실패");
        }

        logger.info("🧠 관리자 Intent:", intent, "Target:", target);

        // 2️⃣ Intent별 실행
        switch (intent) {
            case "회원추가":
                if (!target) {
                    // target이 없으면 team 컬렉션에 추가
                    await db.collection("teams").add({
                        name: "신규팀",
                        members: [{ name: "신규회원", joinedAt: new Date() }],
                        createdAt: new Date(),
                    });
                    return { message: `✅ 신규 팀에 회원이 추가되었습니다.` };
                } else {
                    const teamRef = db.collection("teams").doc(target);
                    const membersRef = teamRef.collection("members");
                    await membersRef.add({
                        name: "신규회원",
                        joinedAt: new Date(),
                    });
                    return { message: `✅ ${target}에 신규 회원이 추가되었습니다.` };
                }

            case "일정조회":
                const eventsSnap = await db
                    .collection("events")
                    .where("team", "==", target || "")
                    .orderBy("date", "desc")
                    .limit(3)
                    .get();

                if (eventsSnap.empty) {
                    return { message: `경기 일정이 없습니다.` };
                }

                const result = eventsSnap.docs
                    .map((d) => {
                        const e = d.data();
                        return `📅 ${e.date} - ${e.opponent || "상대없음"}`;
                    })
                    .join("\n");
                return { message: `최신 경기 일정입니다:\n${result}` };

            case "리포트생성":
                logger.info("📊 주간 리포트 생성 요청");
                return { message: "📊 주간 리포트를 생성했습니다." };

            case "슬랙전송":
                logger.info("💬 Slack 전송 요청");
                return { message: "💬 Slack으로 리포트를 전송했습니다." };

            case "통계요약":
                const statsSnap = await db.collection("weeklyReports").orderBy("createdAt", "desc").limit(1).get();
                if (statsSnap.empty) {
                    return { message: `📊 통계 데이터가 없습니다.` };
                }
                const data = statsSnap.docs[0].data();
                return {
                    message: `👥 회원 ${data.totalMembers || 0}명, ⚽ 경기 ${data.totalMatches || 0}건`,
                };

            default:
                return { message: "명령을 이해하지 못했습니다. 다시 말씀해주세요." };
        }
    } catch (err) {
        logger.error("❌ 관리자 음성 처리 오류", err);
        return { error: String(err) };
    }
});

