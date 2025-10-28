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
exports.generatePredictiveInsights = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const storage_1 = require("firebase-admin/storage");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
exports.generatePredictiveInsights = (0, scheduler_1.onSchedule)({
    schedule: "0 10 * * 1", // 매주 월요일 오전 10시
    timeZone: "Asia/Seoul",
}, async () => {
    var _a;
    logger.info("📈 미래 운영 예측 리포트 생성 시작");
    const [summariesSnap, emotionsSnap, simulationsSnap] = await Promise.all([
        db.collection("teamSummaries").get(),
        db.collection("emotionReports").orderBy("createdAt", "desc").limit(10).get(),
        db.collection("digitalTwinSimulations").orderBy("createdAt", "desc").limit(10).get(),
    ]);
    const summaries = summariesSnap.docs.map((d) => d.data());
    const emotions = emotionsSnap.docs.map((d) => d.data());
    const simulations = simulationsSnap.docs.map((d) => d.data());
    const prompt = `
    다음 데이터 기반으로 향후 4주간의 운영 트렌드를 예측해줘.
    각 팀별로:
    - 활동도(참여율) 추세
    - 만족도 변화 예측
    - 피로도 위험
    - 감정 분위기 (긍정/부정 비율)
    - 리스크 예측

    마지막에 전체 요약을 추가하고 JSON 형식으로 반환해.
    {
      "teamForecasts": [
        {"team":"청룡팀", "참여율":"상승", "만족도":"보통→높음", "리스크":"낮음", "요약":"..."},
        {"team":"백호팀", "참여율":"감소", "만족도":"높음→보통", "리스크":"중간", "요약":"..."}
      ],
      "globalSummary":"..."
    }
    데이터:
    ${JSON.stringify({ summaries, emotions, simulations }, null, 2)}
    `;
    let parsed = { teamForecasts: [], globalSummary: "AI 분석 실패" };
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        const result = ((_a = ai.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "{}";
        parsed = JSON.parse(result);
    }
    catch (err) {
        logger.warn("⚠️ AI 예측 실패");
    }
    // PDF 생성
    const pdfPath = path.join("/tmp", `predictive-${Date.now()}.pdf`);
    const doc = new pdfkit_1.default();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    doc.fontSize(20).text("🔮 YAGO VIBE Predictive Insight Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(parsed.globalSummary, { align: "left" });
    doc.moveDown();
    parsed.teamForecasts.forEach((t) => {
        doc.fontSize(14).text(`🏟️ ${t.team}`);
        doc.fontSize(12).text(`참여율: ${t.참여율}`);
        doc.text(`만족도: ${t.만족도}`);
        doc.text(`리스크: ${t.리스크}`);
        doc.text(`요약: ${t.요약}`);
        doc.moveDown();
    });
    doc.end();
    await new Promise((res) => writeStream.on("finish", () => res()));
    const bucket = (0, storage_1.getStorage)().bucket();
    const dest = `predictiveReports/predictive-${Date.now()}.pdf`;
    await bucket.upload(pdfPath, { destination: dest });
    fs.unlinkSync(pdfPath);
    await db.collection("predictiveReports").add({
        createdAt: new Date(),
        forecast: parsed,
        storagePath: dest,
    });
    logger.info("✅ 미래 예측 리포트 생성 완료");
});
//# sourceMappingURL=predictiveInsightGenerator.js.map