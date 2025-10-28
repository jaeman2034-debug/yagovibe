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
exports.voiceAnalyticsAssistant = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
(0, app_1.initializeApp)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
exports.voiceAnalyticsAssistant = (0, https_1.onCall)(async (req) => {
    var _a;
    const text = (req.data.text || "").trim();
    logger.info("🎤 음성 질의 수신:", text);
    const db = (0, firestore_1.getFirestore)();
    try {
        // 1️⃣ 데이터 수집
        const reportsSnap = await db.collection("weeklyReports").orderBy("createdAt", "desc").limit(5).get();
        const reports = reportsSnap.docs.map((d) => d.data());
        const labels = reports.map((r) => { var _a, _b; return new Date(((_b = (_a = r.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || r.createdAt).toLocaleDateString("ko-KR"); });
        const members = reports.map((r) => r.totalMembers || 0);
        const matches = reports.map((r) => r.totalMatches || 0);
        // 2️⃣ AI 요약 문장 생성
        const prompt = `
    사용자의 질문: "${text}"
    최근 ${reports.length}주간 회원 수와 경기 수 데이터는 다음과 같습니다.
    회원 수: ${members.join(", ")}
    경기 수: ${matches.join(", ")}
    이에 대한 주요 변화 요약과 인사이트를 2~3문장으로 설명해줘.
    `;
        let summary = "AI 요약 생성 실패";
        try {
            const aiRes = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });
            summary = ((_a = aiRes.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || summary;
        }
        catch (aiError) {
            logger.warn("⚠️ AI 요약 생성 실패");
        }
        // 3️⃣ 그래프 데이터 반환 (이미지 대신 데이터)
        const chartData = {
            labels,
            datasets: [
                { label: "회원 수", data: members },
                { label: "경기 수", data: matches },
            ],
        };
        return {
            summary,
            chartData,
            message: `📊 리포트를 완성했습니다.`,
        };
    }
    catch (err) {
        logger.error("❌ Voice Analytics 오류", err);
        return { error: String(err) };
    }
});
//# sourceMappingURL=voiceAnalyticsAssistant.js.map