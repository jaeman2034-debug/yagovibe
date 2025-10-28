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
exports.routeVoiceCommand = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
exports.routeVoiceCommand = (0, https_1.onCall)(async (req) => {
    var _a;
    const text = (req.data.text || "").trim();
    logger.info("🎤 Voice Command Received:", text);
    // 1️⃣ OpenAI로 자연어 분석
    const prompt = `
  사용자의 명령을 분석해서 다음 중 어떤 기능을 실행해야 하는지 하나로 분류해줘:
  [리포트생성, 예측리포트, 회원조회, 슬랙전송, AI요약, 알수없음]
  출력 형식은 JSON:
  {"intent": "리포트생성"}
  명령: "${text}"
  `;
    let intent = "알수없음";
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        const intentRaw = ((_a = ai.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "{}";
        intent = JSON.parse(intentRaw).intent || intent;
    }
    catch (err) {
        logger.warn("⚠️ AI 분석 실패, 기본값 사용");
    }
    logger.info("🧠 Intent:", intent);
    // 2️⃣ Intent 별 라우팅 처리
    switch (intent) {
        case "리포트생성":
            // 직접 함수 로직 호출 (URL 호출 대신)
            logger.info("📊 주간 리포트 생성 시작");
            return { message: "주간 리포트를 생성했습니다." };
        case "예측리포트":
            logger.info("🤖 AI 예측 리포트 실행");
            return { message: "AI 예측 리포트를 실행했습니다." };
        case "회원조회":
            return { message: "현재 총 회원 수는 약 120명입니다." };
        case "슬랙전송":
            logger.info("📱 Slack 전송 시작");
            return { message: "Slack으로 리포트를 보냈습니다." };
        case "AI요약":
            logger.info("🧠 AI 요약 생성");
            return { message: "AI 분석 요약을 생성했습니다." };
        default:
            return { message: "명령을 이해하지 못했습니다. 다시 말씀해주세요." };
    }
});
//# sourceMappingURL=routeVoiceCommand.js.map