"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamVoiceAgent = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
exports.teamVoiceAgent = (0, https_1.onCall)(async (req) => {
    var _a, _b;
    const text = (req.data.text || "").trim();
    const user = req.data.user || "admin";
    // 🧠 팀별 세션 문맥 저장소
    const sessionRef = db.collection("teamVoiceSessions").doc(user);
    const snap = await sessionRef.get();
    const history = snap.exists ? ((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.context) || "" : "";
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
    let parsed = {};
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        const result = ((_b = ai.choices[0].message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
        parsed = JSON.parse(result);
    }
    catch (_c) {
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
//# sourceMappingURL=teamVoiceAgent.js.map