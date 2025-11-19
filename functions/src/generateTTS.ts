import { onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";

export const generateTTS = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send({ error: "Method not allowed" });
      return;
    }

    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      res.status(400).send({ error: "No text provided" });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY 환경 변수가 설정되어 있지 않습니다.");
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(buffer);
  } catch (error) {
    console.error("generateTTS error", error);
    res.status(500).send({ error: "TTS 생성 실패" });
  }
});
