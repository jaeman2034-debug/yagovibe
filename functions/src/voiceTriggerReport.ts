import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";

initializeApp();

export const voiceTriggerReport = onCall(async (req) => {
    const db = getFirestore();
    const bucket = getStorage().bucket();
    logger.info("🎤 음성 명령 리포트 생성 시작");

    try {
        const teams = await db.collection("teams").get();
        let totalMembers = 0;
        let totalMatches = 0;
        teams.forEach((t) => {
            const data = t.data();
            totalMembers += data.members?.length || 0;
            totalMatches += data.matches?.length || 0;
        });

        // PDF 생성 (Canvas 없이 텍스트만)
        const pdfPath = path.join("/tmp", `voice-report-${Date.now()}.pdf`);
        const doc = new PDFDocument();
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

        await new Promise<void>((r) => writeStream.on("finish", () => r()));

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
    } catch (e) {
        logger.error("❌ 음성 리포트 생성 오류", e);
        return { error: String(e) };
    }
});

