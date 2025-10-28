import OpenAI from "openai";

const client = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

export const POST = async (request: Request) => {
    try {
        console.log("🎧 GPT 리포트 요약 요청 시작...");

        const body = await request.json();
        console.log("📊 요약 요청 데이터:", {
            summary: body.summary?.substring(0, 100) + "...",
            insightsCount: body.insights?.length || 0,
            recommendationsCount: body.recommendations?.length || 0,
            totalLogs: body.totalLogs || 0
        });

        const prompt = `
다음은 YAGO VIBE 주간 활동 리포트입니다.
음성 브리핑용으로 3문장 이내의 자연스러운 한국어 요약문을 만들어주세요.

요약 스타일:
- 간결하고 명확한 문장
- 핵심 수치와 주요 발견사항 포함
- 자연스러운 말투로 작성
- 음성으로 들었을 때 이해하기 쉬운 표현 사용

리포트 데이터:
- 요약: ${body.summary || "요약 없음"}
- 총 로그: ${body.totalLogs || 0}건
- 지역 샘플: ${body.geoCount || 0}개
- 디바이스 유형: ${body.deviceTypes || 0}개
- 액션 유형: ${body.actionTypes || 0}개

주요 인사이트:
${body.insights?.map((i: string) => `• ${i}`).join('\n') || "인사이트 없음"}

추천사항:
${body.recommendations?.map((r: string) => `• ${r}`).join('\n') || "추천사항 없음"}

위 데이터를 바탕으로 음성 브리핑용 요약문을 작성해주세요.
`;

        const res = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 300
        });

        const brief = res.choices[0].message?.content?.trim() || "요약 생성 실패";
        console.log("✅ GPT 요약 생성 완료:", brief);

        return new Response(JSON.stringify({ brief }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("❌ summarizeReport 오류:", err);

        // 오류 시 기본 요약 제공
        const fallbackBrief = "죄송합니다. 리포트 요약 생성 중 오류가 발생했습니다. 다시 시도해주세요.";

        return new Response(JSON.stringify({ brief: fallbackBrief }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
};

// CORS preflight 요청 처리
export const OPTIONS = async () => {
    return new Response(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
};
