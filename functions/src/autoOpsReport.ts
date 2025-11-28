import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
// 🔥 Lazy import: 무거운 모듈들은 함수 내부에서 동적 import
// import OpenAI from "openai";
// import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import { getStorage } from "firebase-admin/storage";
import fetch from "node-fetch";

const db = getFirestore();

export const generateOpsReport = onSchedule(
    {
        schedule: "0 9 * * 1", // 매주 월요일 09:00
        timeZone: "Asia/Seoul",
    },
    async () => {
        // 🔥 Lazy import: 무거운 모듈들을 함수 실행 시점에 동적으로 로드
        const { getOpenAIClient } = await import("./lib/openaiClient");
        const PDFDocument = (await import("pdfkit")).default;

        const openai = getOpenAIClient();

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
            fullSummary = ai.choices[0].message?.content || fullSummary;
        } catch (err) {
            logger.warn("⚠️ AI 요약 실패");
        }

        // 2️⃣ PDF 생성
        const pdfPath = path.join("/tmp", `ops-report-${Date.now()}.pdf`);
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        doc.fontSize(20).text("📈 YAGO VIBE Weekly Ops Report", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(fullSummary, { align: "left" });
        doc.end();

        await new Promise<void>((res) => writeStream.on("finish", () => res()));

        // 3️⃣ 업로드
        const bucket = getStorage().bucket();
        const dest = `opsReports/ops-report-${Date.now()}.pdf`;
        await bucket.upload(pdfPath, { destination: dest, contentType: "application/pdf" });
        fs.unlinkSync(pdfPath);

        // 4️⃣ Slack 전송
        const webhook = process.env.SLACK_WEBHOOK_URL;
        if (webhook) {
            await fetch(webhook, {
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
    }
);

