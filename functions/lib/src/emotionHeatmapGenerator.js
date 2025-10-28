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
exports.generateEmotionHeatmap = void 0;
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
exports.generateEmotionHeatmap = (0, scheduler_1.onSchedule)({
    schedule: "0 8 * * 1", // 매주 월요일 오전 8시
    timeZone: "Asia/Seoul",
}, async () => {
    var _a;
    logger.info("🎨 감정 Heatmap 및 리포트 생성 시작");
    const feedbackSnap = await db.collection("voiceFeedbacks").get();
    if (feedbackSnap.empty) {
        logger.warn("⚠️ 피드백 데이터 없음");
        return;
    }
    // 팀별 감정 분류
    const teamMap = {};
    feedbackSnap.forEach((doc) => {
        const d = doc.data();
        if (!teamMap[d.team])
            teamMap[d.team] = [];
        teamMap[d.team].push(d);
    });
    const bucket = (0, storage_1.getStorage)().bucket();
    for (const [team, entries] of Object.entries(teamMap)) {
        // const labels = entries.map((e) => // 미사용
        //   new Date(e.createdAt?.toDate?.() || e.createdAt).toLocaleDateString("ko-KR")
        // );
        const satisfaction = entries.map((e) => e.만족도 || 0);
        // AI 감정 요약
        const prompt = `
      팀명: ${team}
      만족도 데이터: [${satisfaction.join(", ")}]
      이 팀의 주간 감정 변화 요약을 두 문장으로 해줘.
      `;
        let summary = "요약 생성 실패";
        try {
            const aiRes = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });
            summary = ((_a = aiRes.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || summary;
        }
        catch (err) {
            logger.warn("⚠️ AI 요약 실패");
        }
        // PDF 생성 (차트 없이)
        const pdfPath = path.join("/tmp", `${team}-emotion-${Date.now()}.pdf`);
        const doc = new pdfkit_1.default();
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);
        doc.fontSize(20).text(`🧠 ${team} 주간 감정 리포트`, { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`📅 생성일: ${new Date().toLocaleDateString("ko-KR")}`);
        doc.moveDown();
        doc.text(`📊 만족도 추이: ${satisfaction.join(" → ")}`);
        doc.moveDown();
        doc.text("📝 AI 요약:");
        doc.moveDown();
        doc.fontSize(10).text(summary);
        doc.end();
        await new Promise((res) => writeStream.on("finish", () => res()));
        // 업로드
        const dest = `emotionReports/${team}-${Date.now()}.pdf`;
        await bucket.upload(pdfPath, { destination: dest, contentType: "application/pdf" });
        fs.unlinkSync(pdfPath);
        await db.collection("emotionReports").add({
            team,
            summary,
            reportPath: dest,
            createdAt: new Date(),
        });
        logger.info(`✅ ${team} 감정 리포트 업로드 완료`);
    }
});
//# sourceMappingURL=emotionHeatmapGenerator.js.map