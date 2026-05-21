/**
 * 🧠 Select Best Place (LLM)
 * 후보 중 1개 선택 (Decision Only)
 */

import * as logger from "firebase-functions/logger";

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

export interface PlaceCandidate {
  name: string;
  address: string;
  rating: number;
  openNow: boolean | null;
}

/**
 * LLM으로 후보 중 1개 선택
 */
export async function selectBestPlaceWithLLM(
  userText: string,
  candidates: PlaceCandidate[]
): Promise<number> {
  if (candidates.length === 0) return 0;
  if (candidates.length === 1) return 0;

  try {
    const openai = await getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "너는 장소 선택기다. " +
            "사용자 요청에 가장 적합한 장소 하나를 고른다. " +
            "설명하지 말고 숫자만 반환한다. " +
            "예: 0 또는 1 또는 2 등",
        },
        {
          role: "user",
          content:
            "요청:\n" +
            userText +
            "\n\n후보:\n" +
            candidates
              .map(
                (c, i) =>
                  `${i}. ${c.name}, 주소: ${c.address}, 평점: ${c.rating}, 영업중: ${
                    c.openNow !== null ? (c.openNow ? "예" : "아니오") : "알수없음"
                  }`
              )
              .join("\n") +
            "\n\n가장 적합한 후보의 번호만 반환해줘:",
        },
      ],
      temperature: 0,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || "0";
    const index = parseInt(responseText.replace(/\D/g, ""), 10);

    // 유효한 범위인지 확인
    if (isNaN(index) || index < 0 || index >= candidates.length) {
      throw new Error(`Invalid index: ${index}`);
    }

    return index;
  } catch (error: any) {
    logger.error("❌ 후보 선택 오류:", error);
    throw error;
  }
}
