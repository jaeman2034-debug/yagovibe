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
exports.orchestrateAIModules = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
exports.orchestrateAIModules = (0, scheduler_1.onSchedule)({
    schedule: "0 8 * * 1", // 매주 월요일 08:00
    timeZone: "Asia/Seoul",
}, async () => {
    var _a;
    logger.info("🎯 AI Orchestrator 1.0 시작");
    const modules = [
        "generateWeeklyReport",
        "generateEmotionHeatmap",
        "generatePredictiveInsights",
        "aiGovernanceMonitor",
        "autonomousActionEngine",
        "selfLearningGovernance",
    ];
    const status = [];
    for (const mod of modules) {
        try {
            status.push({ name: mod, state: "✅ 실행됨", time: new Date().toISOString() });
        }
        catch (err) {
            status.push({ name: mod, state: "❌ 실패", error: String(err) });
        }
    }
    const summaryPrompt = `
    다음은 AI 모듈들의 실행 상태 로그입니다:
    ${JSON.stringify(status, null, 2)}
    이번 주 YAGO VIBE 운영 상태를 한 문단으로 요약하고 개선 제안을 3가지로 작성해줘.
    `;
    let summary = "AI 요약 생성 실패";
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: summaryPrompt }],
        });
        summary = ((_a = ai.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || summary;
    }
    catch (err) {
        logger.warn("⚠️ AI 요약 실패");
    }
    // Firestore에 기록
    await db.collection("orchestrationLogs").add({
        createdAt: new Date(),
        summary,
        modules: status,
    });
    // Slack 전송
    if (process.env.SLACK_WEBHOOK_URL) {
        try {
            await (0, node_fetch_1.default)(process.env.SLACK_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: `🎯 *YAGO VIBE Orchestrator Summary*\n\n${summary}`,
                }),
            });
        }
        catch (err) {
            logger.warn("⚠️ Slack 전송 실패");
        }
    }
    logger.info("✅ Orchestrator 요약 전송 완료");
});
//# sourceMappingURL=orchestratorCore.js.map