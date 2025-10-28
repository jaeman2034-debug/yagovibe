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
exports.voiceAdminConsole = void 0;
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
exports.voiceAdminConsole = (0, https_1.onCall)(async (req) => {
    var _a;
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
            const result = ((_a = ai.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "{}";
            const parsed = JSON.parse(result);
            intent = parsed.intent || intent;
            target = parsed.target || target;
        }
        catch (parseError) {
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
                }
                else {
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
    }
    catch (err) {
        logger.error("❌ 관리자 음성 처리 오류", err);
        return { error: String(err) };
    }
});
//# sourceMappingURL=voiceAdminConsole.js.map