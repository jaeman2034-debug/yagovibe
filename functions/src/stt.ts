/**
 * 🎙 STT (Speech-to-Text) Firebase Function
 * 모바일 앱에서 base64 오디오를 받아 Whisper API로 텍스트 변환
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Readable } from "stream";
import Busboy from "busboy";

// OpenAI 클라이언트 (지연 초기화)
let openaiClient: any = null;
async function getOpenAIClient(): Promise<any> {
  if (!openaiClient) {
    const OpenAI = (await import("openai")).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
}

// multipart/form-data 파싱 함수
interface ParsedForm {
  files: {
    [key: string]: {
      buffer: Buffer;
      filename: string;
      mimeType: string;
    };
  };
  fields: {
    [key: string]: string;
  };
}

function parseMultipartForm(req: any): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const result: ParsedForm = { files: {}, fields: {} };

    try {
      const busboy = Busboy({
        headers: req.headers,
        defParamCharset: "utf8",
      });

      busboy.on("file", (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const buffers: Buffer[] = [];

        file.on("data", (data) => {
          buffers.push(data);
        });

        file.on("end", () => {
          result.files[fieldname] = {
            buffer: Buffer.concat(buffers),
            filename: filename || "",
            mimeType: mimeType || "",
          };
        });
      });

      busboy.on("field", (fieldname, value) => {
        result.fields[fieldname] = value;
      });

      busboy.on("finish", () => {
        resolve(result);
      });

      busboy.on("error", (err) => {
        reject(err);
      });

      const raw = req.rawBody;
      if (!raw) {
        reject(new Error("No rawBody in request"));
        return;
      }

      const stream = Readable.from(raw);
      stream.pipe(busboy);
    } catch (err) {
      reject(err);
    }
  });
}

export const stt = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
    secrets: ["OPENAI_API_KEY"], // 🔐 Secret Manager에서 API Key 가져오기
    requireRawBody: true, // multipart/form-data를 위해 필수
  } as any,
  async (req, res) => {
    // 🔍 요청 로그 (디버깅용)
    logger.info("REQ HIT");
    logger.info("method=" + req.method);
    logger.info("headers=" + JSON.stringify(req.headers));

    // CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    let tempFilePath: string | null = null;

    try {
      logger.info("🎙 STT 요청 수신");

      // Content-Type 확인
      const contentType = req.headers["content-type"] || "";
      let audioBuffer: Buffer;

      if (contentType.includes("multipart/form-data")) {
        // multipart/form-data 처리
        logger.info("📤 multipart/form-data 요청 수신");
        const { files } = await parseMultipartForm(req);

        if (!files.audio) {
          res.status(400).json({ error: "No audio file provided" });
          return;
        }

        audioBuffer = files.audio.buffer;
        logger.info("📦 오디오 파일 정보:", {
          size: audioBuffer.length,
          filename: files.audio.filename,
          mimeType: files.audio.mimeType,
        });
        logger.info("audio file received");
      } else {
        // JSON body에서 base64 추출 (기존 방식 지원)
        logger.info("📤 JSON 요청 수신 (base64)");
        const { audioBase64 } = req.body;

        if (!audioBase64) {
          res.status(400).json({ error: "No audioBase64 provided" });
          return;
        }

        // base64를 Buffer로 변환
        audioBuffer = Buffer.from(audioBase64, "base64");

        logger.info("📦 오디오 파일 정보:", {
          size: audioBuffer.length,
          base64Length: audioBase64.length,
        });
      }

      // OpenAI 클라이언트 가져오기
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        logger.error("❌ OPENAI_API_KEY not found in environment");
        res.status(500).json({ error: "OPENAI_API_KEY not configured" });
        return;
      }

      const openai = await getOpenAIClient();

      // 🎯 정답 패턴: Buffer → 임시 파일 → fs.createReadStream
      // Whisper API는 fs.createReadStream만 정확히 처리함
      tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.m4a`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      logger.info("🧠 Whisper API 호출 시작");

      const audioResp = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
        language: "ko",
      });

      const text = audioResp.text;

      logger.info("✅ STT 완료:", text);

      res.json({ text });
    } catch (error: any) {
      logger.error("❌ STT 오류:", error);
      res.status(500).json({
        error: "STT failed",
        message: error.message,
      });
    } finally {
      // 임시 파일 정리 (사용한 경우)
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          logger.warn("임시 파일 삭제 실패:", e);
        }
      }
    }
  }
);
