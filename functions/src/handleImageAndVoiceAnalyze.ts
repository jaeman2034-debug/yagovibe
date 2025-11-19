import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import OpenAI from "openai";
import Busboy from "busboy";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

// OpenAI 클라이언트
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// 이미지 파일을 Buffer로 변환하는 함수
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
    const busboy = Busboy({ headers: req.headers });
    const result: ParsedForm = { files: {}, fields: {} };

    busboy.on("file", (name, file, info) => {
      const buffers: Buffer[] = [];

      file.on("data", (data: Buffer) => {
        buffers.push(data);
      });

      file.on("end", () => {
        result.files[name] = {
          buffer: Buffer.concat(buffers),
          filename: info.filename || "",
          mimeType: info.mimeType || "",
        };
      });
    });

    busboy.on("field", (name: string, value: string) => {
      result.fields[name] = value;
    });

    busboy.on("finish", () => resolve(result));
    busboy.on("error", (err: Error) => reject(err));

    req.pipe(busboy);
  });
}

/**
 * 이미지 + 음성 분석 처리
 * FormData로 이미지와 오디오를 받아서 OpenAI Vision + Whisper로 분석
 */
export const handleImageAndVoiceAnalyze = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
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

    try {
      const { files } = await parseMultipartForm(req);

      const image = files.image ? files.image.buffer : null;
      const audio = files.audio ? files.audio.buffer : null;

      let voiceText = "";
      let imageDescriptor = "";
      let finalResult: any = {};

      // 1) 이미지 → 세부 디스크립터 생성 (Multi-step Reasoning)
      if (image) {
        logger.info("📸 이미지 세부 디스크립터 생성 시작");

        const descriptorPrompt = `
이 이미지를 분석하고 다음 내용을 매우 상세하게 설명해줘:

- 형태 (크기, 모양, 구조)
- 색상 (주요 색상, 패턴)
- 재질 (가죽, 합성소재, 천, 플라스틱 등)
- 브랜드 특징 (로고, 특징적인 디자인 요소)
- 연식 추정 (신제품인지, 중고인지, 사용 기간 추정)
- 사용감/상태 (깨끗함, 마모도, 흠집 등)
- 구성품 (포함된 액세서리나 부속품)
- 카테고리 후보 3개 (가장 적합한 카테고리부터)
- 유사 제품들 (비슷한 제품 예시)

출력 형식: 자연어 설명으로 상세하게 작성.
`;

        try {
          const descriptorResp = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: descriptorPrompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${image.toString("base64")}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 1000,
          });

          imageDescriptor = descriptorResp.choices[0]?.message?.content || "";
          logger.info("📸 이미지 디스크립터 생성 완료:", imageDescriptor.substring(0, 200));
        } catch (descriptorError: any) {
          logger.error("❌ 이미지 디스크립터 생성 오류:", descriptorError);
          imageDescriptor = "이미지 분석 실패";
        }
      }

      // 2) 음성 텍스트 변환
      if (audio) {
        logger.info("🎙️ 음성 분석 시작");

        try {
          // OpenAI Whisper API 사용 (Node.js 환경용)
          const audioFile = {
            name: "voice.wav",
            stream: () => {
              const { Readable } = require("stream");
              return Readable.from(audio);
            },
            size: audio.length,
            type: "audio/wav",
          } as any;

          const audioResp = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "ko",
          });

          voiceText = audioResp.text;
          logger.info("🎙️ 음성 분석 결과:", voiceText);
        } catch (audioError: any) {
          logger.error("❌ 음성 분석 오류:", audioError);
          // 음성 분석 실패해도 계속 진행
        }
      }

      // 3) 이미지 설명 + 음성 → 최종 상품 분석 (JSON Schema 고정)
      if (imageDescriptor || voiceText) {
        logger.info("🤖 최종 상품 분석 시작");

        const finalPrompt = `
아래 두 정보를 기반으로 상품을 정확하게 분석해줘.

[이미지 디스크립터]
${imageDescriptor || "이미지 정보 없음"}

[음성 설명]
${voiceText || "음성 설명 없음"}

다음 JSON 형식으로만 출력해줘 (다른 설명 없이 JSON만):

{
  "productName": "정확한 상품명",
  "category": "카테고리 (예: 축구화, 농구공, 테니스라켓 등)",
  "brand": "브랜드명 (불명확하면 빈 문자열)",
  "condition": "상/중/하 중 하나",
  "description": "상세한 상품 설명 (100자 이상)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
}

조건:
- 한국 중고 거래 시장 기준으로 자연스럽게 작성
- 브랜드가 불명확하면 "" 로 두기
- 상태는 "상", "중", "하" 중 하나만 선택
- 태그는 3~5개, 특징을 잘 나타내는 키워드
- description은 구체적이고 상세하게 작성
- 반드시 유효한 JSON 형식만 출력 (코드 블록 없이)
`;

        try {
          const finalResp = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "당신은 중고 거래 상품 분석 전문가입니다. 이미지와 음성 설명을 정확하게 분석하여 JSON 형식으로만 응답합니다.",
              },
              {
                role: "user",
                content: finalPrompt,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 800,
          });

          const finalText = finalResp.choices[0]?.message?.content || "{}";
          logger.info("🤖 최종 분석 결과:", finalText);

          // JSON 파싱 (JSON Schema로 고정되어 있어 파싱 오류 최소화)
          try {
            const jsonMatch = finalText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              finalResult = JSON.parse(jsonMatch[0]);
            } else {
              finalResult = JSON.parse(finalText);
            }

            // 필수 필드 검증 및 기본값 설정
            finalResult = {
              productName: finalResult.productName || "상품",
              category: finalResult.category || "스포츠용품",
              brand: finalResult.brand || "",
              condition: finalResult.condition || "중",
              description: finalResult.description || "상품 설명",
              tags: Array.isArray(finalResult.tags) ? finalResult.tags : ["스포츠", "용품"],
            };

            logger.info("✅ 최종 분석 완료:", finalResult);
          } catch (parseError: any) {
            logger.error("❌ JSON 파싱 오류:", parseError);
            // Fallback
            finalResult = {
              productName: "상품",
              category: "스포츠용품",
              brand: "",
              condition: "중",
              description: imageDescriptor || voiceText || "상품 설명",
              tags: ["스포츠", "용품"],
            };
          }
        } catch (finalError: any) {
          logger.error("❌ 최종 분석 오류:", finalError);
          // Fallback
          finalResult = {
            productName: "상품",
            category: "스포츠용품",
            brand: "",
            condition: "중",
            description: imageDescriptor || voiceText || "상품 설명",
            tags: ["스포츠", "용품"],
          };
        }
      } else {
        // 이미지와 음성이 모두 없는 경우
        finalResult = {
          productName: "상품",
          category: "스포츠용품",
          brand: "",
          condition: "중",
          description: "상품 설명이 없습니다.",
          tags: ["스포츠", "용품"],
        };
      }

      logger.info("✅ AI 분석 완료:", finalResult);
      res.json(finalResult);
    } catch (e: any) {
      logger.error("🔥 AI 서버 오류:", e);
      res.status(500).json({ error: true, message: e.message });
    }
  }
);

/**
 * 태그 생성 함수
 */
export const generateTags = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
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

    try {
      const text = req.body?.text || "";

      if (!text) {
        res.status(400).json({ error: "text 필드가 필요합니다." });
        return;
      }

      const prompt = `
다음 상품 설명을 분석해서 연관 태그를 3개 만들어줘.
형식: ["태그1", "태그2", "태그3"]
설명: ${text}
`;

      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
        ],
        max_tokens: 200,
      });

      const content = resp.choices[0]?.message?.content?.trim() || "[]";
      
      // JSON 파싱
      let tags: string[] = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          tags = JSON.parse(jsonMatch[0]);
        } else {
          tags = JSON.parse(content);
        }
      } catch (parseError) {
        logger.warn("⚠️ 태그 JSON 파싱 실패, 기본값 사용");
        tags = ["스포츠", "용품"];
      }

      res.json({ tags });
    } catch (e: any) {
      logger.error("🔥 태그 생성 오류:", e);
      res.status(500).json({ error: true, message: e.message });
    }
  }
);

