// 천재모드: 하이브리드 NLU (로컬 패턴 + GPT 의미 분석)
// OpenAI 키가 없으면 로컬 패턴만으로 동작합니다.

type NLUResult = { intent: string; confidence: number; meta?: Record<string, any> };

// (1) 로컬 패턴 우선: 빠르고 확실한 매칭
const intents = [
    { tag: "지도_이동", patterns: ["지도 열어줘", "지도 페이지로 이동", "지도 보여줘", "지도로 이동"] },
    { tag: "현재위치", patterns: ["현재 위치", "내 위치", "지금 위치", "현재 위치로 이동"] },
    { tag: "근처_편의점", patterns: ["근처 편의점", "편의점 찾아줘", "주변 편의점", "편의점 검색"] },
    { tag: "근처_축구장", patterns: ["근처 축구장", "축구장 찾아줘", "주변 축구장", "축구할 곳"] },
];

function matchByPattern(text: string): NLUResult | null {
    const normalized = text.trim();
    for (const intent of intents) {
        if (intent.patterns.some((p) => normalized.includes(p))) {
            return { intent: intent.tag, confidence: 1.0 };
        }
    }
    return null;
}

// (2) OpenAI 의미 분석 (옵션)
async function analyzeByOpenAI(text: string): Promise<NLUResult> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY?.toString()?.trim();
    if (!apiKey) return { intent: "기타", confidence: 0.0 };

    // 브라우저 번들을 사용하는 경우에만 동작하도록 동적 import
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

    const messages = [
        { role: "system" as const, content: "너는 한국어 지도/위치/검색 명령을 의도 태그로 분류하는 NLU야.", name: "system" },
        {
            role: "user" as const,
            content:
                `명령어: "${text}"\n` +
                `가능한 의도 태그 중 하나로만 답해: 지도_이동, 현재위치, 근처_편의점, 근처_축구장, 기타\n` +
                `추가 설명 없이 태그 문자열만 반환해.`,
            name: "user"
        },
    ];

    const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.0,
    });

    const content = res.choices?.[0]?.message?.content?.trim() || "기타";
    return { intent: content, confidence: 0.8 };
}

// (3) 공개 analyze 함수 — 프로젝트 어디서든 import해서 사용
export async function analyze(text: string): Promise<NLUResult> {
    // 1) 로컬 패턴
    const byPattern = matchByPattern(text);
    if (byPattern) {
        console.log("🎯 NLU(패턴):", byPattern.intent);
        return byPattern;
    }

    // 2) OpenAI 의미 분석 (키가 없으면 기타 반환)
    try {
        const byAI = await analyzeByOpenAI(text);
        console.log("🧠 NLU(GPT):", byAI.intent);
        return byAI;
    } catch (e) {
        console.warn("NLU OpenAI 실패 → 기타 처리:", e);
        return { intent: "기타", confidence: 0.0 };
    }
}

// (4) analyzeCommand 함수 - 음성 루프용 간단한 인터페이스
export async function analyzeCommand(text: string): Promise<{ intent: string; target: string }> {
    const result = await analyze(text);

    // intent를 일관된 형식으로 변환
    let target = "";
    if (result.intent.includes("축구장")) target = "축구장";
    else if (result.intent.includes("편의점")) target = "편의점";
    else if (result.intent.includes("카페")) target = "카페";
    else if (result.intent.includes("식당")) target = "식당";
    else if (result.intent.includes("약국")) target = "약국";

    return {
        intent: result.intent,
        target
    };
}
