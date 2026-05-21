import { onRequest } from "firebase-functions/v2/https";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";
import PDFDocument from "pdfkit";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getDefaultStorageBucket } from "./lib/defaultStorageBucket";
import OpenAI from "openai";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export const generateReportAssets = onRequest({ cors: true, region: "asia-northeast3", timeoutSeconds: 120 }, async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { reportId, reportData } = req.body || {};
    if (!reportId || !reportData) {
      res.status(400).json({ error: "❌ Missing report data" });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
      return;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      doc.fontSize(18).text("📘 YAGO SPORTS AI 리포트", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).text(`상품명: ${reportData.name || "-"}`);
      doc.text(`카테고리: ${reportData.category || "-"}`);
      const priceValue = Number(reportData.price || 0);
      doc.text(`가격: ${priceValue ? priceValue.toLocaleString() : "-"} 원`);
      doc.moveDown();
      doc.fontSize(12).text(`AI 분석 요약: ${reportData.analysis?.summary || "없음"}`);
      doc.text(`AI 추천가: ${reportData.analysis?.priceSuggest || "없음"} 원`);
      doc.end();
    });

    const timestamp = Date.now();
    const pdfTempPath = join(tmpdir(), `${reportId}-${timestamp}.pdf`);
    await writeFile(pdfTempPath, pdfBuffer);

    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: `상품명 ${reportData.name || "이름 없음"}. 요약: ${
        reportData.analysis?.summary || "없음"
      }. 추천가 ${reportData.analysis?.priceSuggest || "없음"}원입니다.`,
    });

    const audioTempPath = join(tmpdir(), `${reportId}-${timestamp}.mp3`);
    const audioBuffer = Buffer.from(await mp3.arrayBuffer());
    await writeFile(audioTempPath, audioBuffer);

    const pdfDestination = `reports/${reportId}.pdf`;
    const audioDestination = `reports/${reportId}.mp3`;

    const [pdfFile] = await getDefaultStorageBucket().upload(pdfTempPath, {
      destination: pdfDestination,
      contentType: "application/pdf",
    });

    const [audioFile] = await getDefaultStorageBucket().upload(audioTempPath, {
      destination: audioDestination,
      contentType: "audio/mpeg",
    });

    const [pdfUrl] = await pdfFile.getSignedUrl({
      action: "read",
      expires: "03-09-2030",
    });

    const [audioUrl] = await audioFile.getSignedUrl({
      action: "read",
      expires: "03-09-2030",
    });

    await db.collection("reports").doc(reportId).update({
      pdfUrl,
      audioUrl,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await Promise.allSettled([unlink(pdfTempPath), unlink(audioTempPath)]);

    res.status(200).json({ success: true, pdfUrl, audioUrl });
  } catch (error: any) {
    console.error("generateReportAssets error", error);
    res.status(500).json({ error: error?.message || "자산 생성 실패" });
  }
});
