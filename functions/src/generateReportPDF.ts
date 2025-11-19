import { onCall } from "firebase-functions/v2/https";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import { WebClient } from "@slack/web-api";
import { jsPDF } from "jspdf";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const storage = new Storage();
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

export const generateReportPdf = onCall(async (req) => {
  const { reportId } = req.data || {};
  if (!reportId || typeof reportId !== "string") {
    throw new Error("reportId is required");
  }

  const docSnap = await db.collection("reports").doc(reportId).get();
  if (!docSnap.exists) {
    throw new Error("Report not found");
  }

  const report = docSnap.data() || {};

  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text("🏆 YAGO VIBE AI 리포트", 20, 20);
  pdf.setFontSize(12);
  pdf.text(`제목: ${report.name || "제목 없음"}`, 20, 35);
  pdf.text(`작성자: ${report.author || "익명"}`, 20, 45);

  const createdAt = report.createdAt?.toDate ? report.createdAt.toDate() : new Date();
  pdf.text(`날짜: ${createdAt.toLocaleString()}`, 20, 55);
  pdf.text("요약:", 20, 70);
  pdf.text(report.analysis?.summary || "요약 없음", 20, 80, { maxWidth: 160 });

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  if (!bucketName) {
    throw new Error("FIREBASE_STORAGE_BUCKET 환경 변수가 설정되어 있지 않습니다.");
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(`reports/${reportId}.pdf`);
  await file.save(pdfBuffer, { contentType: "application/pdf" });

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: "01-01-2030",
  });

  if (process.env.SLACK_BOT_TOKEN) {
    try {
      await slack.chat.postMessage({
        channel: process.env.SLACK_REPORT_CHANNEL || "#ai-reports",
        text: `📄 새 리포트 업로드됨: *${report.name || "제목 없음"}*\nPDF 보기: ${signedUrl}`,
      });
    } catch (error) {
      console.error("Slack 알림 실패", error);
    }
  }

  return { url: signedUrl };
});
