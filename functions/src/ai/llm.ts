// functions/src/ai/llm.ts
import OpenAI from "openai";

export type LlmResult = { summary: string; recommendation: string };

function fallbackSummarize(input: {
  title?: string;
  collection: string;
  action: string;
  ethicsScore?: number;
  ethicsReasons?: string[];
}) {
  const reasons = (input.ethicsReasons ?? []).slice(0, 3).join(" / ");
  const score = input.ethicsScore ?? 0;

  return {
    summary: `[${input.collection}] ${input.action} 요청. ethics=${score}. ${reasons || "사유 없음"}`,
    recommendation:
      score < 60
        ? "고위험: 변경 범위·권한·반복 수정 여부를 우선 확인하고 필요 시 반려."
        : "검토: 변경 데이터(diff)와 영향 범위를 확인한 뒤 승인 여부 결정.",
  } satisfies LlmResult;
}

/**
 * ✅ 기본은 fallback으로 동작
 * ✅ OPENAI_API_KEY를 넣으면 OpenAI로 요약 가능(선택)
 * - OpenAI 호출은 서버에서만 수행
 */
export async function summarizeWithLlmOrFallback(input: {
  collection: string;
  action: string;
  docId?: string | null;
  before?: any;
  payload?: any;
  ethicsScore?: number;
  ethicsReasons?: string[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"; // 기본값 설정

  if (!apiKey) {
    return fallbackSummarize({
      collection: input.collection,
      action: input.action,
      ethicsScore: input.ethicsScore,
      ethicsReasons: input.ethicsReasons,
    });
  }

  // ⚠️ 모델/엔드포인트는 너희가 사용하는 방식에 맞게 유지.
  // 여기서는 "요약/추천만" 생성하도록 매우 제한적인 프롬프트를 사용.
  const prompt = [
    "너는 운영 보조 요약기다. 결정을 내리면 안 된다(approve/reject 금지).",
    "아래 변경 요청을 1~2문장으로 요약하고, 검토 포인트(추천 조치)를 1~2문장으로 제시하라.",
    "출력 형식: JSON {summary: string, recommendation: string}",
    "",
    `collection: ${input.collection}`,
    `action: ${input.action}`,
    `docId: ${input.docId ?? "(new)"}`,
    `ethicsScore: ${input.ethicsScore ?? "-"}`,
    `ethicsReasons: ${(input.ethicsReasons ?? []).join(" / ")}`,
    "",
    "before(JSON 일부):",
    JSON.stringify(input.before ?? null).slice(0, 2000),
    "",
    "after(payload JSON 일부):",
    JSON.stringify(input.payload ?? null).slice(0, 2000),
  ].join("\n");

  // OpenAI Chat Completions API 사용 (프로젝트에서 사용하는 방식과 동일)
  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "너는 운영 보조 요약기다. 결정을 내리면 안 된다(approve/reject 금지). " +
            "아래 변경 요청을 1~2문장으로 요약하고, 검토 포인트(추천 조치)를 1~2문장으로 제시하라. " +
            "출력 형식: JSON {summary: string, recommendation: string}",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(text);
    if (typeof parsed?.summary === "string" && typeof parsed?.recommendation === "string") {
      return { summary: parsed.summary, recommendation: parsed.recommendation } satisfies LlmResult;
    }
    throw new Error("bad format");
  } catch (error) {
    console.warn("[summarizeWithLlmOrFallback] OpenAI 호출 실패, fallback 사용:", error);
    return fallbackSummarize({
      collection: input.collection,
      action: input.action,
      ethicsScore: input.ethicsScore,
      ethicsReasons: input.ethicsReasons,
    });
  }
}
