import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import { getStorage } from "firebase-admin/storage";

initializeApp();
const db = getFirestore();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});

export const generateEmotionHeatmap = onSchedule(
    {
        schedule: "0 8 * * 1", // 매주 월요일 오전 8시
        timeZone: "Asia/Seoul",
    },
    async () => {
        logger.info("🎨 감정 Heatmap 및 리포트 생성 시작");
        const feedbackSnap = await db.collection("voiceFeedbacks").get();
        if (feedbackSnap.empty) {
            logger.warn("⚠️ 피드백 데이터 없음");
            return;
        }

        // 팀별 감정 분류
        const teamMap: Record<string, any[]> = {};
        feedbackSnap.forEach((doc) => {
            const d = doc.data();
            if (!teamMap[d.team]) teamMap[d.team] = [];
            teamMap[d.team].push(d);
        });

        const bucket = getStorage().bucket();

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
                summary = aiRes.choices[0].message?.content || summary;
            } catch (err) {
                logger.warn("⚠️ AI 요약 실패");
            }

            // PDF 생성 (차트 없이)
            const pdfPath = path.join("/tmp", `${team}-emotion-${Date.now()}.pdf`);
            const doc = new PDFDocument();
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

            await new Promise<void>((res) => writeStream.on("finish", () => res()));

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
    }
);

