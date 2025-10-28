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
exports.voiceTriggerReport = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const storage_1 = require("firebase-admin/storage");
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
(0, app_1.initializeApp)();
exports.voiceTriggerReport = (0, https_1.onCall)(async (req) => {
    const db = (0, firestore_1.getFirestore)();
    const bucket = (0, storage_1.getStorage)().bucket();
    logger.info("🎤 음성 명령 리포트 생성 시작");
    try {
        const teams = await db.collection("teams").get();
        let totalMembers = 0;
        let totalMatches = 0;
        teams.forEach((t) => {
            var _a, _b;
            const data = t.data();
            totalMembers += ((_a = data.members) === null || _a === void 0 ? void 0 : _a.length) || 0;
            totalMatches += ((_b = data.matches) === null || _b === void 0 ? void 0 : _b.length) || 0;
        });
        // PDF 생성 (Canvas 없이 텍스트만)
        const pdfPath = path.join("/tmp", `voice-report-${Date.now()}.pdf`);
        const doc = new pdfkit_1.default();
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);
        doc.fontSize(18).text("🎤 Voice AI 리포트", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`📅 생성일: ${new Date().toLocaleString()}`);
        doc.moveDown();
        doc.text(`👥 회원 수: ${totalMembers}`);
        doc.text(`⚽ 경기 수: ${totalMatches}`);
        doc.moveDown();
        doc.text("💬 음성 명령: " + (req.data.command || "없음"));
        doc.end();
        await new Promise((r) => writeStream.on("finish", () => r()));
        // Storage 업로드
        const dest = `voiceReports/voice-report-${Date.now()}.pdf`;
        await bucket.upload(pdfPath, { destination: dest, contentType: "application/pdf" });
        fs.unlinkSync(pdfPath);
        // Firestore 기록
        await db.collection("voiceReports").add({
            createdAt: new Date(),
            storagePath: dest,
            transcript: req.data.command || "없음",
            totalMembers,
            totalMatches,
        });
        logger.info("✅ 음성 리포트 생성 완료", { path: dest });
        return { result: "✅ 리포트 생성 완료", path: dest };
    }
    catch (e) {
        logger.error("❌ 음성 리포트 생성 오류", e);
        return { error: String(e) };
    }
});
//# sourceMappingURL=voiceTriggerReport.js.map