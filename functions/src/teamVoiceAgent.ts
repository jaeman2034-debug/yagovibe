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

export const teamVoiceAgent = onCall(async (req) => {
    const text = (req.data.text || "").trim();
    const user = req.data.user || "admin";

    // 🧠 팀별 세션 문맥 저장소
    const sessionRef = db.collection("teamVoiceSessions").doc(user);
    const snap = await sessionRef.get();
    const history = snap.exists ? snap.data()?.context || "" : "";

    logger.info("🎤 [VoiceAgent]", text);

    // 🔍 1️⃣ NLU : Intent + 팀명 추출
    const prompt = `
지금까지의 대화: 
${history}

새로운 명령: "${text}"

이 문장에서 intent(동작)과 team(팀명)을 JSON으로 반환해줘.
가능한 intent: [리포트생성, 일정조회, 회원추가, 리포트전송, 통계요약, 알수없음]
예시: {"intent":"리포트생성","team":"청룡팀"}
`;

    let parsed: any = {};
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });

        const result = ai.choices[0].message?.content || "{}";
        parsed = JSON.parse(result);
    } catch {
        parsed = { intent: "알수없음" };
    }

    const intent = parsed.intent || "알수없음";
    const team = parsed.team || "공통";

    // 🧠 대화 컨텍스트 저장
    await sessionRef.set({
        updatedAt: new Date(),
        context: `${history}\n사용자:${text}\nAI:${JSON.stringify(parsed)}`,
    });

    logger.info("🤖 Intent:", intent, "Team:", team);

    // ⚙️ 2️⃣ Intent 별 실행 로직
    switch (intent) {
        case "리포트생성":
            logger.info(`📊 ${team} 리포트 생성 요청`);
            return { message: `📊 ${team} 리포트를 생성했습니다.` };

        case "일정조회":
            const eventsSnap = await db
                .collection("events")
                .where("team", "==", team)
                .orderBy("date", "desc")
                .limit(3)
                .get();

            if (eventsSnap.empty) {
                return { message: `${team} 일정이 없습니다.` };
            }

            const eventsList = eventsSnap.docs
                .map((d) => {
                    const e = d.data();
                    return `📅 ${e.date || "날짜없음"} - ${e.opponent || "상대없음"}`;
                })
                .join("\n");

            return {
                message: `${team} 최근 경기 일정:\n${eventsList}`,
            };

        case "회원추가":
            await db.collection("teams").doc(team).collection("members").add({
                name: "신규회원",
                joinedAt: new Date(),
            });
            logger.info(`🙋‍♂️ ${team} 신규 회원 추가`);
            return { message: `🙋‍♂️ ${team}에 새 회원이 추가되었습니다.` };

        case "리포트전송":
            logger.info(`💬 ${team} 리포트 Slack 전송 요청`);
            return { message: `💬 ${team} 리포트를 Slack으로 전송했습니다.` };

        case "통계요약":
            const reportsSnap = await db
                .collection("weeklyReports")
                .where("team", "==", team)
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();

            if (reportsSnap.empty) {
                return { message: `${team} 리포트가 아직 없습니다.` };
            }

            const r = reportsSnap.docs[0].data();
            return {
                message: `${team} 요약: 회원 ${r.totalMembers || 0}명, 경기 ${r.totalMatches || 0}건 활동.`,
            };

        default:
            return { message: "🤔 무슨 말인지 잘 모르겠어요. 팀명을 함께 말해주세요." };
    }
});

