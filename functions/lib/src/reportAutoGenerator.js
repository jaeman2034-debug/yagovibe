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
exports.generateWeeklyReportJob = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const app_1 = require("firebase-admin/app");
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const openai_1 = __importDefault(require("openai"));
(0, app_1.initializeApp)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_API_KEY>",
});
exports.generateWeeklyReportJob = (0, scheduler_1.onSchedule)({
    schedule: "0 9 * * 1",
    timeZone: "Asia/Seoul",
}, async () => {
    var _a;
    const db = (0, firestore_1.getFirestore)();
    const bucket = (0, storage_1.getStorage)().bucket();
    logger.info("🧠 AI 리포트 PDF 자동 생성 시작");
    try {
        // 1️⃣ Firestore 데이터 가져오기
        const teamsRef = db.collection("teams");
        const snapshot = await teamsRef.get();
        let totalMembers = 0;
        let totalMatches = 0;
        snapshot.forEach((doc) => {
            var _a, _b;
            const data = doc.data();
            totalMembers += ((_a = data.members) === null || _a === void 0 ? void 0 : _a.length) || 0;
            totalMatches += ((_b = data.matches) === null || _b === void 0 ? void 0 : _b.length) || 0;
        });
        // 2️⃣ AI 요약 생성
        const prompt = `지난 주간 회원 수 ${totalMembers}명, 경기 ${totalMatches}건의 데이터를 분석해 스포츠 커뮤니티 활성도 및 향후 참여율을 간략히 예측해줘.`;
        let summary = "데이터 요약 생성 실패";
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });
            summary = ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || summary;
        }
        catch (aiError) {
            logger.warn("⚠️ AI 요약 생성 실패, 기본 요약 사용");
            summary = `활동률: ${totalMembers}명 회원이 ${totalMatches}건의 경기에 참여했습니다.`;
        }
        // 3️⃣ PDF 생성
        const doc = new pdfkit_1.default();
        const filePath = path.join("/tmp", `weekly-report-${Date.now()}.pdf`);
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);
        doc.fontSize(20).text("📊 YAGO VIBE AI 리포트", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`📅 생성일: ${new Date().toLocaleString()}`);
        doc.moveDown();
        doc.text(`👥 총 회원 수: ${totalMembers}`);
        doc.text(`⚽ 총 경기 건수: ${totalMatches}`);
        doc.moveDown();
        doc.text("🤖 AI 요약 결과:");
        doc.moveDown();
        doc.fontSize(10).text(summary);
        doc.end();
        await new Promise((res) => writeStream.on("finish", () => res()));
        // 4️⃣ Storage 업로드
        const destination = `reports/ai-weekly-report-${Date.now()}.pdf`;
        await bucket.upload(filePath, {
            destination,
            contentType: "application/pdf",
        });
        logger.info(`✅ PDF 리포트 업로드 완료 → ${destination}`);
        // 5️⃣ Firestore에 기록
        await db.collection("weeklyReports").add({
            createdAt: new Date(),
            totalMembers,
            totalMatches,
            summary,
            storagePath: destination,
        });
        fs.unlinkSync(filePath);
        logger.info("✅ 주간 리포트 완료 및 임시 파일 삭제");
    }
    catch (err) {
        logger.error("❌ 리포트 생성 오류", err);
    }
});
//# sourceMappingURL=reportAutoGenerator.js.map