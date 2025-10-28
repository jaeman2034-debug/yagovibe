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
exports.generateTeamSummaries = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
exports.generateTeamSummaries = (0, scheduler_1.onSchedule)({
    schedule: "0 7 * * 1", // 매주 월요일 오전 7시
    timeZone: "Asia/Seoul",
}, async () => {
    var _a, _b, _c;
    logger.info("📊 팀별 AI 요약 카드 생성 시작");
    const teamsSnap = await db.collection("teams").get();
    const summaries = [];
    for (const doc of teamsSnap.docs) {
        const teamId = doc.id;
        const data = doc.data();
        const members = ((_a = data.members) === null || _a === void 0 ? void 0 : _a.length) || 0;
        const matches = ((_b = data.matches) === null || _b === void 0 ? void 0 : _b.length) || 0;
        const recentPerf = Math.floor(Math.random() * 100); // 테스트용 가상 점수
        const prompt = `
      팀명: ${teamId}
      회원 수: ${members}
      경기 수: ${matches}
      활동 점수: ${recentPerf}
      요약:
      1. 주간 팀 활동을 한 문단으로 요약해줘.
      2. 활동 수준을 5단계 중 하나로 분류해줘: [매우 높음, 높음, 보통, 낮음, 매우 낮음]
      JSON 형식으로 출력:
      {"summary":"...", "level":"..."}
      `;
        let parsed = { summary: "AI 요약 실패", level: "보통" };
        try {
            const ai = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });
            const result = ((_c = ai.choices[0].message) === null || _c === void 0 ? void 0 : _c.content) || "{}";
            parsed = JSON.parse(result);
        }
        catch (err) {
            logger.warn("⚠️ AI 요약 실패");
        }
        summaries.push({
            teamId,
            members,
            matches,
            activityScore: recentPerf,
            summary: parsed.summary,
            level: parsed.level,
            updatedAt: new Date(),
        });
    }
    for (const s of summaries) {
        await db.collection("teamSummaries").doc(s.teamId).set(s);
    }
    logger.info("✅ 팀별 AI 요약 카드 업데이트 완료");
});
//# sourceMappingURL=teamSummaryGenerator.js.map