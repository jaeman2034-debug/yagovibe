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
exports.analyzeVoiceFeedback = void 0;
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
exports.analyzeVoiceFeedback = (0, https_1.onCall)(async (req) => {
    var _a;
    const { team, text } = req.data;
    if (!team || !text)
        return { error: "팀명과 텍스트가 필요합니다." };
    logger.info("🎤 음성 피드백 수신:", { team, text });
    const prompt = `
  팀원 피드백: "${text}"
  다음 감정 지표를 분석해서 JSON으로 반환해줘:
  { "감정": "긍정/부정/중립", "피로도": "낮음/보통/높음", "만족도": 0~100, "요약": "..." }
  `;
    let parsed = { 감정: "중립", 피로도: "보통", 만족도: 50, 요약: "AI 분석 실패" };
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        const result = ((_a = ai.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "{}";
        parsed = JSON.parse(result);
    }
    catch (err) {
        logger.warn("⚠️ AI 분석 실패");
    }
    await db.collection("voiceFeedbacks").add(Object.assign(Object.assign({ team,
        text }, parsed), { createdAt: new Date() }));
    // 팀별 요약 평균 업데이트
    const feedbacksSnap = await db
        .collection("voiceFeedbacks")
        .where("team", "==", team)
        .get();
    const avgSatisfaction = feedbacksSnap.docs.reduce((sum, f) => sum + (f.data().만족도 || 0), 0) /
        (feedbacksSnap.size || 1);
    await db.collection("teamSummaries").doc(team).update({
        avgSatisfaction,
        lastFeedback: parsed.요약,
        lastEmotion: parsed.감정,
        lastFatigue: parsed.피로도,
    });
    return { message: `✅ ${team} 피드백이 반영되었습니다.`, analysis: parsed };
});
//# sourceMappingURL=voiceFeedbackAnalyzer.js.map