import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import PDFDocument from "pdfkit";
import fetch from "node-fetch";
import { OpenAI } from "openai";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

const OPENAI_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_KEY ||
  process.env.openai_key ||
  "";

const openai = new OpenAI({ apiKey: OPENAI_KEY });

const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL ||
  process.env.slack_webhook_url ||
  "";

export const generateWeeklyReportAI = onSchedule(
  {
    schedule: "every monday 09:30",
    timeZone: "Asia/Seoul",
  },
  async () => {
    console.log("📊 [YAGO VIBE] AI 주간 리포트 생성 시작");

    if (!OPENAI_KEY) {
      console.warn("⚠️ OPENAI API 키가 설정되지 않아 주간 AI 리포트를 생성할 수 없습니다.");
      return;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const snapshot = await db
      .collection("reports")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(oneWeekAgo))
      .orderBy("createdAt", "desc")
      .get();

    const reports = snapshot.docs.map((doc) => doc.data() as any);
    const total = reports.length;

    if (total === 0) {
      console.log("⚠️ 이번 주 리포트 데이터가 없어 생성을 건너뜁니다.");
      return;
    }

    const summaries = reports
      .map((report: any, index: number) => {
        const title = report.title || report.name || "제목 없음";
        const summary = report.summary || report.analysis?.summary || "요약 없음";
        return `${index + 1}. ${title}: ${summary}`;
      })
      .join("\n");

    const prompt = `다음은 지난 주 YAGO VIBE 활동 리포트입니다. 주요 인사이트를 한국어로 명확하게 요약해 주세요.\n\n${summaries}`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const summaryText = aiResponse.choices[0]?.message?.content?.trim() || "요약을 생성하지 못했습니다.";

    const periodText = `${oneWeekAgo.toLocaleDateString("ko-KR")} ~ ${now.toLocaleDateString("ko-KR")}`;

    const pdfFileName = `weekly_report_${Date.now()}.pdf`;
    const pdfPath = path.join(os.tmpdir(), pdfFileName);

    await generatePdf({
      path: pdfPath,
      periodText,
      total,
      summaryText,
    });

    const [pdfUpload] = await storage.bucket().upload(pdfPath, {
      destination: `reports/${pdfFileName}`,
      metadata: { contentType: "application/pdf" },
    });

    const [pdfUrl] = await pdfUpload.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    fs.unlink(pdfPath, (err) => {
      if (err) {
        console.warn("PDF 임시 파일 삭제 실패:", err);
      }
    });

    const speechText = `이번 주 YAGO VIBE 주요 요약입니다. ${summaryText}`;

    const speechResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: speechText,
      response_format: "mp3",
    });

    const mp3FileName = `weekly_report_${Date.now()}.mp3`;
    const mp3Path = path.join(os.tmpdir(), mp3FileName);
    const mp3Buffer = Buffer.from(await speechResponse.arrayBuffer());
    fs.writeFileSync(mp3Path, mp3Buffer);

    const [mp3Upload] = await storage.bucket().upload(mp3Path, {
      destination: `reports/${mp3FileName}`,
      metadata: { contentType: "audio/mpeg" },
    });

    const [mp3Url] = await mp3Upload.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    fs.unlink(mp3Path, (err) => {
      if (err) {
        console.warn("MP3 임시 파일 삭제 실패:", err);
      }
    });

    await db.collection("aiReports").add({
      createdAt: admin.firestore.Timestamp.now(),
      summary: summaryText,
      totalReports: total,
      pdfUrl,
      ttsUrl: mp3Url,
      period: {
        from: oneWeekAgo.toISOString(),
        to: now.toISOString(),
      },
    });

    console.log("✅ Firestore aiReports 컬렉션에 저장 완료");

    if (!SLACK_WEBHOOK_URL) {
      console.warn("⚠️ SLACK_WEBHOOK_URL이 설정되지 않아 Slack 전송이 생략되었습니다.");
      return;
    }

    const slackMessage = {
      text: `📢 *YAGO VIBE 주간 AI 리포트*\n\n🗓️ ${now.toLocaleDateString("ko-KR")}\n🗂️ 기간: ${periodText}\n📋 리포트 수: ${total}\n\n🧠 AI 요약:\n${summaryText}\n\n📄 PDF 다운로드: ${pdfUrl}\n🔊 음성 리포트: ${mp3Url}`,
    };

    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });

    console.log("✅ Slack으로 주간 AI 리포트를 전송했습니다.");
    console.log("🎯 [YAGO VIBE] 주간 AI 리포트 완성");
  },
);

async function generatePdf({
  path,
  periodText,
  total,
  summaryText,
}: {
  path: string;
  periodText: string;
  total: number;
  summaryText: string;
}) {
  return new Promise<void>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(path);
      doc.pipe(stream);

      doc.fontSize(20).text("📊 YAGO VIBE 주간 리포트", { align: "left" });
      doc.moveDown();

      doc.fontSize(12).text(`🗂️ 기간: ${periodText}`);
      doc.text(`📋 총 리포트 수: ${total}`);
      doc.moveDown();

      doc.fontSize(14).text("🧠 AI 자동 요약", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(summaryText, { align: "left" });

      doc.end();

      stream.on("finish", () => resolve());
      stream.on("error", (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}
