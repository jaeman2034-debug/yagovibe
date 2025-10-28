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
exports.voiceMemoryAssistant = void 0;
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
exports.voiceMemoryAssistant = (0, https_1.onCall)(async (req) => {
    var _a, _b;
    const user = req.data.user || "admin";
    const text = (req.data.text || "").trim();
    const sessionRef = db.collection("voiceSessions").doc(user);
    const sessionSnap = await sessionRef.get();
    const history = sessionSnap.exists ? ((_a = sessionSnap.data()) === null || _a === void 0 ? void 0 : _a.context) || "" : "";
    logger.info(`🎙️ [${user}] ${text}`);
    const prompt = `
다음은 지금까지의 대화 이력입니다:
${history}

새로운 명령: "${text}"
이전 맥락을 참고하여 어떤 동작(intent)을 실행해야 할지 JSON으로 답해줘.
가능한 intent: [리포트생성, 리포트전송, 리포트조회, 일정조회, 알수없음]
형식: {"intent": "리포트전송", "target": "지난주 리포트"}
`;
    let parsed = { intent: "알수없음" };
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        const content = ((_b = ai.choices[0].message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
        parsed = JSON.parse(content);
    }
    catch (err) {
        logger.warn("⚠️ AI 파싱 실패");
    }
    // 맥락 갱신
    await sessionRef.set({
        updatedAt: new Date(),
        context: `${history}\n사용자: ${text}\nAI: ${JSON.stringify(parsed)}`,
    });
    logger.info("🧠 Context Intent:", parsed);
    switch (parsed.intent) {
        case "리포트생성":
            logger.info("📊 리포트 생성 요청");
            return { message: "📊 리포트를 새로 생성했습니다." };
        case "리포트전송":
            logger.info("💬 리포트 전송 요청");
            return { message: "💬 리포트를 전송했습니다." };
        case "리포트조회":
            logger.info("📄 리포트 조회 요청");
            return { message: "📄 최신 리포트를 보여드릴게요." };
        case "일정조회":
            logger.info("📅 일정 조회 요청");
            return { message: "📅 이번 주 경기 일정은 3건입니다." };
        default:
            return { message: "🤔 무슨 말인지 잘 모르겠어요. 다시 말씀해주세요." };
    }
});
//# sourceMappingURL=voiceMemoryAssistant.js.map