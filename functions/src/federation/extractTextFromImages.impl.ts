import { logger } from "firebase-functions";
import vision from "@google-cloud/vision";
import { getOpenAIClient, resolveOpenAIApiKey } from "../lib/openaiClient";

type RequestData = {
  imageUrls?: string[];
  images?: string[]; // 프론트 실수 호환용 alias
};

export async function handleExtractTextFromImages(req: { data: RequestData }) {
  try {
    const imageUrls =
      (Array.isArray(req.data?.imageUrls) ? req.data.imageUrls : null) ||
      (Array.isArray(req.data?.images) ? req.data.images : []) ||
      [];

    logger.info("[extractTextFromImages] request", {
      imageCount: imageUrls.length,
      hasImageUrls: Array.isArray(req.data?.imageUrls),
      hasImagesAlias: Array.isArray(req.data?.images),
      imageUrls,
    });

    if (imageUrls.length === 0) {
      return { text: "", error: "imageUrls 없음" };
    }

    const apiKey = resolveOpenAIApiKey();
    const openai = apiKey ? getOpenAIClient() : null;
    const visionClient = new vision.ImageAnnotatorClient();

    const results: string[] = [];
    for (const imageUrl of imageUrls) {
      let extracted = "";
      try {
        logger.info("[extractTextFromImages] OCR start", { imageUrl });

        // 1) OpenAI OCR 우선 시도
        if (openai) {
          const res = await openai.responses.create({
            model: "gpt-4.1-mini",
            input: [
              {
                role: "user",
                content: [
                  { type: "input_text", text: "이미지에서 모든 텍스트를 정확히 추출해줘." },
                  { type: "input_image", image_url: imageUrl, detail: "auto" },
                ],
              },
            ],
          });
          extracted = String(res.output_text || "").trim();
        }

        // 2) OpenAI 결과가 비어있으면 Google Vision fallback
        if (!extracted) {
          // 2-a) URI 기반 Vision OCR
          let visionRes: any;
          try {
            const [res] = await visionClient.textDetection({
              image: { source: { imageUri: imageUrl } },
              imageContext: {
                languageHints: ["ko", "en"],
              },
            });
            visionRes = res;
          } catch (visionUriError) {
            logger.warn("[extractTextFromImages] vision uri OCR failed", {
              imageUrl,
              error: String(visionUriError),
            });
          }

          extracted = String(visionRes?.fullTextAnnotation?.text || "").trim();

          // 2-b) URI OCR이 실패/빈값이면 바이너리 fetch 후 Vision OCR 재시도
          if (!extracted) {
            try {
              const resp = await fetch(imageUrl);
              if (!resp.ok) {
                throw new Error(`image fetch failed: ${resp.status}`);
              }
              const arrBuf = await resp.arrayBuffer();
              const base64Content = Buffer.from(arrBuf).toString("base64");
              const [resByContent] = await visionClient.textDetection({
                image: { content: base64Content },
                imageContext: {
                  languageHints: ["ko", "en"],
                },
              });
              visionRes = resByContent;
              extracted = String(visionRes?.fullTextAnnotation?.text || "").trim();
            } catch (visionContentError) {
              logger.warn("[extractTextFromImages] vision content OCR failed", {
                imageUrl,
                error: String(visionContentError),
              });
            }
          }

          logger.info("[extractTextFromImages] OCR raw result", {
            imageUrl,
            hasFullText: !!visionRes?.fullTextAnnotation?.text,
            textAnnotationsCount: visionRes?.textAnnotations?.length || 0,
          });
        }

        if (extracted) {
          results.push(extracted);
        } else {
          logger.warn("[extractTextFromImages] OCR empty result", { imageUrl });
        }
      } catch (e) {
        logger.error("[extractTextFromImages] OCR failed", { imageUrl, error: String(e) });
      }
    }

    const merged = results.join("\n").trim();
    logger.info("[extractTextFromImages] done", {
      imageCount: imageUrls.length,
      extractedLength: merged.length,
      preview: merged.slice(0, 200),
    });
    return { text: merged };
  } catch (error: any) {
    logger.error("[extractTextFromImages] fatal error", {
      message: error?.message || String(error),
      stack: error?.stack,
    });
    return {
      text: "",
      error: error?.message || "OCR 실패",
    };
  }
}

