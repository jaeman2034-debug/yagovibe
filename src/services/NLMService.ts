// === CORE PROTECTED: DO NOT MODIFY BELOW ===
// 🧠 YAGO SPORTS NLM Service with JSON Auto-Correction
// GPT 기반 대화 추론 및 명령 생성

let lastCall = 0;

// ✅ JSON 정규화 함수 (A단계)
const cleanJSON = (text: string) => {
    try {
        // ' ' → ' / " " → "
        return text
            .replace(/['']/g, "'")
            .replace(/[""]/g, '"')
            .replace(/\n/g, "")
            .trim();
    } catch {
        return text;
    }
};

// ✅ 안전한 JSON 파서 (B+C단계)
function safeParseJSON(text: string) {
    // 방어적 파싱: string 타입만 처리
    if (typeof text !== "string") {
        console.warn("⚠️ 응답이 문자열이 아님:", text);
        return { action: "unknown", target: null };
    }

    try {
        // JSON 정규화 적용
        const cleanText = cleanJSON(text);

        // JSON처럼 보이면 파싱
        if (cleanText.startsWith("{")) {
            return JSON.parse(cleanText);
        }

        // 혹은 GPT가 문장으로 응답한 경우를 대비
        const match = cleanText.match(/"action"\s*:\s*"([^"]+)".*"target"\s*:\s*"([^"]+)"/i);
        if (match) {
            return { action: match[1], target: match[2] };
        }
    } catch (e) {
        console.warn("⚠️ JSON Parse Error:", e);
    }

    // 파싱 실패 시 기본값 반환
    return { action: "unknown", target: null };
}

export async function analyzeDialogue(text: string) {
    const now = Date.now();
    const diff = now - lastCall;
    if (diff < 20000) await new Promise((r) => setTimeout(r, 20000 - diff));
    lastCall = Date.now();

    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are an NLU parser. 
Respond ONLY in pure JSON format with lowercase keys.
Example:
{"action": "find_location", "target": "축구장"}

You must respond strictly in JSON format with lowercase keys.
Example:
{"action": "find_location", "target": "축구장"}

No extra words, no explanations, no code blocks.`,
                    },
                    { role: "user", content: text },
                ],
            }),
        });

        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content?.trim() || "";
        console.log("🧠 NLM raw response:", raw);

        // ✅ 안전한 JSON 파서 사용
        const result = safeParseJSON(raw);
        console.log("✅ Parsed NLM result:", result);
        return result;
    } catch (err) {
        console.error("❌ NLM 분석 실패:", err);
        return { action: "unknown", target: null };
    }
}

// === END PROTECTED ===
