import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

initializeApp();

export const ttsSynthesize = onRequest(
  { cors: true, timeoutSeconds: 120, maxInstances: 1, region: "asia-northeast3" },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const { text, voice = "alloy", filePrefix = "ai-report" } = req.body || {};
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "text is required" });
        return;
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });

      const speech = await openai.audio.speech.create({
        model: "tts-1",
        voice,
        input: text,
      });

      const buffer = Buffer.from(await speech.arrayBuffer());

      const bucket = getStorage().bucket();
      const id = uuidv4();
      const filePath = `tts/${filePrefix}-${id}.mp3`;
      const file = bucket.file(filePath);

      await file.save(buffer, {
        contentType: "audio/mpeg",
        resumable: false,
        metadata: { cacheControl: "public, max-age=31536000" },
      });

      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      });

      res.json({ ok: true, url: signedUrl, path: filePath });
    } catch (e: any) {
      logger.error(e);
      res.status(500).json({ error: e?.message || "tts failed" });
    }
  },
);
