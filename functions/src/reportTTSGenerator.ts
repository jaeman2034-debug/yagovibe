import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";

if (!getApps().length) {
  initializeApp();
}

export const generateReportTts = onDocumentCreated("reports/{reportId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const reportId = event.params.reportId;
  const summary = data.analysis?.summary || data.summary || data.title || "AI 분석 리포트입니다.";
  const tmpFile = path.join(os.tmpdir(), `${reportId}-${Date.now()}.mp3`);

  try {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn("OPENAI_API_KEY가 설정되어 있지 않아 TTS 생성을 건너뜁니다.");
      return;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: summary,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(tmpFile, buffer);

    const bucket = getStorage().bucket();
    const destPath = `reports/audio/${reportId}.mp3`;
    await bucket.upload(tmpFile, {
      destination: destPath,
      contentType: "audio/mpeg",
    });

    const [url] = await bucket.file(destPath).getSignedUrl({
      action: "read",
      expires: "03-01-2030",
    });

    await event.data?.ref.update({ ttsUrl: url });
    logger.info(`TTS 생성 완료: ${url}`);
  } catch (error) {
    logger.error("TTS 생성 오류", error);
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
});

