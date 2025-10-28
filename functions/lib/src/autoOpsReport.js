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
exports.generateOpsReport = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const storage_1 = require("firebase-admin/storage");
const node_fetch_1 = __importDefault(require("node-fetch"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
exports.generateOpsReport = (0, scheduler_1.onSchedule)({
    schedule: "0 9 * * 1", // 매주 월요일 09:00
    timeZone: "Asia/Seoul",
}, async () => {
    var _a;
    logger.info("📊 전사 AI 운영 리포트 생성 시작");
    const summariesSnap = await db.collection("teamSummaries").get();
    const emotionSnap = await db.collection("emotionReports").orderBy("createdAt", "desc").limit(5).get();
    const summaries = summariesSnap.docs.map((d) => d.data());
    const emotions = emotionSnap.docs.map((d) => d.data());
    // 1️⃣ AI 전사 요약
    const prompt = `
    다음 팀별 활동 요약과 감정 데이터를 통합해 이번 주 운영 리포트를 작성해줘.
    각 팀별 핵심 성과와 감정 상태를 한 문단씩 요약하고,
    마지막에 전사 분석을 3문장으로 정리해.
    데이터:
    ${JSON.stringify({ summaries, emotions }, null, 2)}
    형식: 팀별요약 → 전사요약
    `;
    let fullSummary = "AI 요약 생성 실패";
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        fullSummary = ((_a = ai.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || fullSummary;
    }
    catch (err) {
        logger.warn("⚠️ AI 요약 실패");
    }
    // 2️⃣ PDF 생성
    const pdfPath = path.join("/tmp", `ops-report-${Date.now()}.pdf`);
    const doc = new pdfkit_1.default();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    doc.fontSize(20).text("📈 YAGO VIBE Weekly Ops Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(fullSummary, { align: "left" });
    doc.end();
    await new Promise((res) => writeStream.on("finish", () => res()));
    // 3️⃣ 업로드
    const bucket = (0, storage_1.getStorage)().bucket();
    const dest = `opsReports/ops-report-${Date.now()}.pdf`;
    await bucket.upload(pdfPath, { destination: dest, contentType: "application/pdf" });
    fs.unlinkSync(pdfPath);
    // 4️⃣ Slack 전송
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (webhook) {
        await (0, node_fetch_1.default)(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `📢 이번 주 YAGO VIBE AI 운영 리포트가 업로드되었습니다.\nhttps://storage.googleapis.com/YOUR_BUCKET/${dest}`,
            }),
        });
    }
    await db.collection("opsReports").add({
        createdAt: new Date(),
        summary: fullSummary,
        storagePath: dest,
    });
    logger.info("✅ 전사 AI 운영 리포트 완성 및 전송 완료");
});
//# sourceMappingURL=autoOpsReport.js.map