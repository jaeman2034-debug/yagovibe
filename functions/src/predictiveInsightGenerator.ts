import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
// Firebase Admin 초기화는 lib/firebaseAdmin.ts에서 처리됨
import { getOpenAIClient } from "./lib/openaiClient";
import * as fs from "fs";
import * as path from "path";
import { getStorage } from "firebase-admin/storage";

const db = getFirestore();

export const generatePredictiveInsights = onSchedule(
    {
        schedule: "0 10 * * 1", // 매주 월요일 오전 10시
        timeZone: "Asia/Seoul",
    },
    async () => {
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

        let parsed: any = { teamForecasts: [], globalSummary: "AI 분석 실패" };

        try {
            const openai = getOpenAIClient();
            const ai = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });

            const result = ai.choices[0].message?.content || "{}";
            parsed = JSON.parse(result);
        } catch (err) {
            logger.warn("⚠️ AI 예측 실패");
        }

        // PDF 생성 (pdfkit은 핸들러 내부에서만 로드 — 배포 분석 타임아웃 방지)
        const PDFDocument = (await import("pdfkit")).default;
        const pdfPath = path.join("/tmp", `predictive-${Date.now()}.pdf`);
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        doc.fontSize(20).text("🔮 YAGO SPORTS Predictive Insight Report", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(parsed.globalSummary, { align: "left" });
        doc.moveDown();

        parsed.teamForecasts.forEach((t: any) => {
            doc.fontSize(14).text(`🏟️ ${t.team}`);
            doc.fontSize(12).text(`참여율: ${t.참여율}`);
            doc.text(`만족도: ${t.만족도}`);
            doc.text(`리스크: ${t.리스크}`);
            doc.text(`요약: ${t.요약}`);
            doc.moveDown();
        });
        doc.end();

        await new Promise<void>((res) => writeStream.on("finish", () => res()));

        const bucket = getStorage().bucket();
        const dest = `predictiveReports/predictive-${Date.now()}.pdf`;
        await bucket.upload(pdfPath, { destination: dest });
        fs.unlinkSync(pdfPath);

        await db.collection("predictiveReports").add({
            createdAt: new Date(),
            forecast: parsed,
            storagePath: dest,
        });

        logger.info("✅ 미래 예측 리포트 생성 완료");
    }
);

