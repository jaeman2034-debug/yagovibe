import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getOpenAIClient, resolveOpenAIApiKey } from "../lib/openaiClient";

type RequestData = {
  imageUrl: string;
};

/**
 * 동적 이미지 섹션 URL을 Vision으로 읽고, 협회 소개용 한국어 설명 초안만 반환 (Firestore 미저장).
 */
export async function handleGenerateFederationImageDescription(req: {
  data: RequestData;
  auth?: { uid?: string };
}) {
  if (!req.auth?.uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const imageUrl = String(req.data?.imageUrl || "").trim();
  if (!imageUrl) {
    throw new HttpsError("invalid-argument", "imageUrl이 필요합니다.");
  }
  if (!/^https:\/\//i.test(imageUrl)) {
    throw new HttpsError(
      "invalid-argument",
      "공개 HTTPS 이미지 URL만 지원합니다. (스토리지에 업로드된 주소를 사용해 주세요.)"
    );
  }
  if (imageUrl.length > 4096) {
    throw new HttpsError("invalid-argument", "imageUrl이 너무 깁니다.");
  }

  const apiKey = resolveOpenAIApiKey();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "OpenAI API 키가 설정되지 않았습니다.");
  }

  const openai = getOpenAIClient();

  logger.info("[generateFederationImageDescription] request", {
    uid: req.auth.uid,
    urlHost: (() => {
      try {
        return new URL(imageUrl).hostname;
      } catch {
        return "invalid-url";
      }
    })(),
  });

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "이 이미지를 보고 스포츠 협회 공식 홈페이지「소개」영역에 넣을 한국어 설명을 작성해줘.\n\n" +
                "조건:\n" +
                "- 한국어만 사용\n" +
                "- 2~3문장, 공식적이고 신뢰감 있는 톤\n" +
                "- 협회 활동·현장 분위기·이미지에서 드러나는 맥락을 살리되, 보이지 않는 사실은 지어내지 말 것\n" +
                "- 제목·따옴표·불릿·번호 목록 없이 본문 문단만 출력",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "low" },
            },
          ],
        },
      ],
    });

    const text = String(res.choices[0]?.message?.content || "").trim();
    if (!text) {
      throw new HttpsError("internal", "생성된 텍스트가 비었습니다.");
    }

    return { ok: true as const, text };
  } catch (e: any) {
    if (e instanceof HttpsError) throw e;
    logger.error("[generateFederationImageDescription] OpenAI failed", String(e));
    throw new HttpsError("internal", e?.message || "AI 생성에 실패했습니다.");
  }
}
