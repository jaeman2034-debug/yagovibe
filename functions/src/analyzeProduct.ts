/**
 * 당근마켓급 상품 자동 분석기
 * 
 * 이미지(파일 or URL) + 사용자 힌트(선택) → 완전한 상품 정보 자동 생성
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import OpenAI from "openai";
import Busboy from "busboy";
import { Readable } from "stream";
import fetch from "node-fetch";

// Firebase Admin 초기화 (지연 초기화)
let adminInitialized = false;
function ensureAdminInitialized() {
  if (!adminInitialized && !getApps().length) {
    initializeApp();
    adminInitialized = true;
  }
}

// OpenAI 클라이언트 (지연 초기화)
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      logger.error("❌ OpenAI API 키가 설정되지 않았습니다.");
      throw new Error("OpenAI API 키가 설정되지 않았습니다. Secret Manager에서 OPENAI_API_KEY를 설정해주세요.");
    }
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
    logger.info("✅ OpenAI 클라이언트 초기화 완료");
  }
  return openaiClient;
}

// 파싱된 폼 데이터 인터페이스
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

// 이미지 URL에서 이미지 다운로드
async function downloadImageFromUrl(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    logger.error("❌ 이미지 URL 다운로드 실패:", error);
    throw new Error(`이미지 다운로드 실패: ${error.message}`);
  }
}

// multipart/form-data 파싱
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

// 이미지 Buffer를 base64 data URL로 변환
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export const analyzeProduct = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60, // Vision + 이미지 처리 시간 고려
    memory: "512MiB", // Vision + base64 이미지 처리용 충분한 메모리
    requireRawBody: true,
    secrets: ["OPENAI_API_KEY"], // Secret Manager에서 OpenAI API 키 가져오기
  } as any,
  async (req, res) => {
    // CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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
      ensureAdminInitialized();
      const openai = getOpenAIClient();

      let imageBuffer: Buffer | null = null;
      let imageMimeType = "image/jpeg";
      let userHints: {
        title?: string;
        category?: string;
        price?: number;
      } = {};

      // 1) 요청 타입 확인: multipart/form-data or JSON
      const contentType = req.headers["content-type"] || "";

      if (contentType.includes("multipart/form-data")) {
        // 파일 업로드 방식
        logger.info("📤 multipart/form-data 요청 수신");

        const { files, fields } = await parseMultipartForm(req);

        // 이미지 파일 추출
        if (files.image) {
          imageBuffer = files.image.buffer;
          imageMimeType = files.image.mimeType || "image/jpeg";
          logger.info("📸 이미지 파일 수신:", {
            size: imageBuffer.length,
            mimeType: imageMimeType,
          });
        }

        // 사용자 힌트 추출
        if (fields.user_title) userHints.title = fields.user_title;
        if (fields.user_category) userHints.category = fields.user_category;
        if (fields.user_price) {
          const price = parseFloat(fields.user_price);
          if (!isNaN(price)) userHints.price = price;
        }
      } else if (contentType.includes("application/json")) {
        // JSON 방식 (이미지 URL)
        logger.info("📤 JSON 요청 수신");

        const body = req.body || {};
        
        // 이미지 URL에서 다운로드
        if (body.image_url) {
          imageBuffer = await downloadImageFromUrl(body.image_url);
          imageMimeType = body.image_mime_type || "image/jpeg";
          logger.info("📸 이미지 URL에서 다운로드 완료:", {
            url: body.image_url,
            size: imageBuffer.length,
          });
        }

        // 사용자 힌트 추출
        if (body.user_title) userHints.title = body.user_title;
        if (body.user_category) userHints.category = body.user_category;
        if (body.user_price) {
          const price = parseFloat(String(body.user_price));
          if (!isNaN(price)) userHints.price = price;
        }
      }

      // 2) 이미지 검증
      if (!imageBuffer || imageBuffer.length === 0) {
        res.status(400).json({
          error: "이미지가 필요합니다. image (파일) 또는 image_url (URL)을 제공해주세요.",
        });
        return;
      }

      // 3) 이미지를 base64 data URL로 변환
      const imageDataUrl = bufferToDataUrl(imageBuffer, imageMimeType);

      // 4) 사용자 힌트를 프롬프트에 포함
      const hintsText = Object.keys(userHints).length > 0
        ? `
[사용자 힌트 (참고용)]
${userHints.title ? `제목: ${userHints.title}` : ""}
${userHints.category ? `카테고리: ${userHints.category}` : ""}
${userHints.price ? `희망 가격: ${userHints.price.toLocaleString()}원` : ""}

위 힌트는 참고용이며, 실제 이미지 분석 결과를 우선시하세요.
`
        : "";

      // 5) OpenAI Vision API 호출 (JSON Schema 강제)
      const systemPrompt = `당신은 한국 중고 거래 플랫폼(당근마켓 등) 전문 상품 분석가입니다.
이미지를 정확하게 분석하여 JSON 형식으로만 응답합니다.
한국어로 응답하며, 자연스럽고 친근한 톤으로 작성합니다.`;

      const userPrompt = `다음 상품 이미지를 분석하여 JSON 형식으로 정확하게 응답해주세요.
${hintsText}
이미지에서 다음 정보를 추출해주세요:
- 정확한 상품명 (title)
- 대분류/중분류 카테고리 (category.major, category.minor)
- 브랜드명 (없으면 null)
- 상태 (새상품/상/중/하)
- 속성 (attributes): 배열 형태의 key-value 쌍 목록
  * 예: [{ "key": "색상", "value": "블랙" }, { "key": "사이즈", "value": "270mm" }, { "key": "저장용량", "value": "128GB" }]
  * 이미지에서 확인되는 속성들을 자유롭게 추가 가능 (각 항목은 key와 value 필드를 가진 객체)
- 검색 태그 (3-5개)
- 추천 가격 범위 (low, high)
- 당근마켓 스타일 상세 설명 (친근하고 간결하게)`;

      logger.info("🤖 OpenAI Vision API 호출 시작", {
        imageSize: imageBuffer.length,
        hasHints: Object.keys(userHints).length > 0,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "product_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "상품명",
                },
                category: {
                  type: "object",
                  properties: {
                    major: {
                      type: "string",
                      description: "대분류 (예: 전자기기, 스포츠용품)",
                    },
                    minor: {
                      type: "string",
                      description: "중분류 (예: 모니터, 축구화)",
                    },
                  },
                  required: ["major", "minor"],
                  additionalProperties: false,
                },
                brand: {
                  type: ["string", "null"],
                  description: "브랜드명 (불명확하면 null)",
                },
                condition: {
                  type: "string",
                  enum: ["새상품", "상", "중", "하"],
                  description: "상품 상태",
                },
                attributes: {
                  type: "array",
                  description: "상품의 색상, 사이즈, 특징 등 key-value 형식 속성 목록",
                  items: {
                    type: "object",
                    properties: {
                      key: {
                        type: "string",
                        description: "속성 이름 (예: 색상, 사이즈, 저장용량)",
                      },
                      value: {
                        type: "string",
                        description: "속성 값 (예: 블랙, 270mm, 128GB)",
                      },
                    },
                    required: ["key", "value"],
                    additionalProperties: false,
                  },
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "검색 태그 (3-5개)",
                },
                price_suggestion: {
                  type: "object",
                  properties: {
                    low: {
                      type: "number",
                      description: "추천 최저가 (원)",
                    },
                    high: {
                      type: "number",
                      description: "추천 최고가 (원)",
                    },
                  },
                  required: ["low", "high"],
                  additionalProperties: false,
                },
                description: {
                  type: "string",
                  description: "당근마켓 스타일 상세 설명 (친근하고 간결하게)",
                },
              },
              required: [
                "title",
                "category",
                "brand",
                "condition",
                "attributes",
                "tags",
                "price_suggestion",
                "description",
              ],
              additionalProperties: false, // 최상위 레벨에서 추가 필드 허용하지 않음
            },
          },
        },
        temperature: 0.3,
        max_tokens: 1500,
      });

      const content = completion.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("OpenAI 응답이 비어있습니다.");
      }

      // 6) JSON 파싱
      let result: any;
      try {
        result = JSON.parse(content);
        
        // 필드 검증 및 기본값 설정
        result = {
          title: result.title || "상품",
          category: {
            major: result.category?.major || "기타",
            minor: result.category?.minor || "기타",
          },
          brand: result.brand || null,
          condition: result.condition || "중",
          attributes: Array.isArray(result.attributes)
            ? result.attributes
            : [],
          tags: Array.isArray(result.tags) && result.tags.length > 0
            ? result.tags
            : ["기타"],
          price_suggestion: {
            low: typeof result.price_suggestion?.low === "number"
              ? result.price_suggestion.low
              : 0,
            high: typeof result.price_suggestion?.high === "number"
              ? result.price_suggestion.high
              : 0,
          },
          description: result.description || "상품 설명",
        };

        logger.info("✅ 상품 분석 완료:", {
          title: result.title,
          category: result.category,
          condition: result.condition,
        });

        res.status(200).json(result);
      } catch (parseError: any) {
        logger.error("❌ JSON 파싱 오류:", parseError);
        
        // Fallback 응답
        res.status(500).json({
          error: "분석 결과 파싱 실패",
          message: parseError.message,
          raw_response: content.substring(0, 500), // 디버깅용
        });
      }
    } catch (error: any) {
      logger.error("🔥 상품 분석 오류:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      // 더 상세한 에러 정보 반환
      const errorMessage = error.message || "알 수 없는 오류가 발생했습니다.";
      
      res.status(500).json({
        error: "상품 분석 실패",
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

