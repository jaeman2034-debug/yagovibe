import OpenAI from "openai";

const client = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
});

export const POST = async (request: Request) => {
    try {
        console.log("🔮 AI 인사이트 생성 시작...");

        const logs = await request.json();
        console.log("📊 받은 로그 데이터:", {
            total: logs.total,
            geoSample: logs.geoSample?.length || 0,
            devices: Object.keys(logs.devices || {}).length,
            actions: Object.keys(logs.actions || {}).length
        });

        const prompt = `
너는 데이터 분석가야. 다음 로그 데이터를 분석해서 
반드시 JSON 형식으로만 출력해:

{
  "title": "오늘의 주요 발견사항 (한 줄 요약)",
  "bullets": [
    "발견사항 1",
    "발견사항 2", 
    "발견사항 3"
  ],
  "actions": [
    "추천 액션 1",
    "추천 액션 2",
    "추천 액션 3"
  ]
}

로그 데이터:
- 총 로그 수: ${logs.total || 0}건
- 위치 샘플: ${logs.geoSample?.length || 0}개
- 디바이스 종류: ${Object.keys(logs.devices || {}).length}개
- 액션 종류: ${Object.keys(logs.actions || {}).length}개

상세 데이터: ${JSON.stringify(logs).slice(0, 6000)}

분석 포인트:
1. 사용 패턴과 트렌드
2. 주요 활동 유형
3. 개선 가능한 영역
4. 사용자 행동 인사이트
`;

        const res = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1000
        });

        const result = res.choices[0].message?.content ?? "{}";
        console.log("✅ AI 인사이트 생성 완료:", result);

        return new Response(result, {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
        });

    } catch (error) {
        console.error("❌ AI 인사이트 생성 오류:", error);

        // 오류 시 기본 응답
        const fallbackResponse = {
            title: "데이터 분석 중 오류가 발생했습니다",
            bullets: [
                "로그 데이터를 확인해주세요",
                "OpenAI API 키가 올바른지 확인해주세요",
                "네트워크 연결을 확인해주세요"
            ],
            actions: [
                "환경 변수를 다시 확인하세요",
                "개발 서버를 재시작해보세요",
                "브라우저 콘솔에서 오류를 확인하세요"
            ]
        };

        return new Response(JSON.stringify(fallbackResponse), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
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
