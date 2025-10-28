import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";

initializeApp();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_API_KEY>",
});

export const generateWeeklyReportJob = onSchedule(
  {
    schedule: "0 9 * * 1",
    timeZone: "Asia/Seoul",
  },
  async () => {
    const db = getFirestore();
    const bucket = getStorage().bucket();
    logger.info("🧠 AI 리포트 PDF 자동 생성 시작");

    try {
      // 1️⃣ Firestore 데이터 가져오기
      const teamsRef = db.collection("teams");
      const snapshot = await teamsRef.get();

      let totalMembers = 0;
      let totalMatches = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalMembers += data.members?.length || 0;
        totalMatches += data.matches?.length || 0;
      });

      // 2️⃣ AI 요약 생성
      const prompt = `지난 주간 회원 수 ${totalMembers}명, 경기 ${totalMatches}건의 데이터를 분석해 스포츠 커뮤니티 활성도 및 향후 참여율을 간략히 예측해줘.`;

      let summary = "데이터 요약 생성 실패";
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        });
        summary = response.choices[0].message?.content || summary;
      } catch (aiError) {
        logger.warn("⚠️ AI 요약 생성 실패, 기본 요약 사용");
        summary = `활동률: ${totalMembers}명 회원이 ${totalMatches}건의 경기에 참여했습니다.`;
      }

      // 3️⃣ PDF 생성
      const doc = new PDFDocument();
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

      await new Promise<void>((res) => writeStream.on("finish", () => res()));

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
    } catch (err) {
      logger.error("❌ 리포트 생성 오류", err);
    }
  }
);
