// src/services/NLUService.ts

/**
 * 🔍 parseQuery: 사용자의 자연어 문장을 intent / keyword 형태로 단순 분석
 * 예: "근처 축구장 찾아줘" → { intent: "search_place", keyword: "축구장" }
 */
export function parseQuery(text: string) {
    const lowered = text.toLowerCase();

    if (lowered.includes("축구장") || lowered.includes("soccer")) {
        return { intent: "search_place", keyword: "축구장" };
    }
    if (lowered.includes("편의점")) {
        return { intent: "search_place", keyword: "편의점" };
    }
    if (lowered.includes("지도") || lowered.includes("위치")) {
        return { intent: "show_map", keyword: "지도" };
    }

    // fallback
    return { intent: "unknown", keyword: text };
}

// ✅ NLUService.ts — 천재 모드 완성본
// 음성 명령 → 의도 분석 → 라우팅 및 검색 처리용 핵심 서비스

export async function analyze(text: string) {
    console.log("🎧 NLU 요청:", text);

    // 🔹 1. 의도 매핑 테이블
    const intentTable = [
        { keywords: ["지도", "지도 페이지"], intent: "open_map" },
        { keywords: ["홈", "홈페이지", "메인"], intent: "go_home" },
        { keywords: ["편의점", "근처 편의점"], intent: "search_convenience" },
        { keywords: ["축구장", "근처 축구장"], intent: "search_soccer" },
        { keywords: ["카페", "근처 카페"], intent: "search_cafe" },
        { keywords: ["현재 위치", "내 위치"], intent: "current_location" },
    ];

    // 🔹 2. 키워드 기반 분석
    const lowerText = text.toLowerCase();
    for (const item of intentTable) {
        if (item.keywords.some(k => lowerText.includes(k))) {
            console.log("✅ NLU 매칭 성공:", item.intent);
            return { intent: item.intent, text };
        }
    }

    // 🔹 3. 기본 응답 (매칭 실패)
    console.warn("⚠️ NLU 매칭 실패: 명령을 이해하지 못했습니다.");
    return { intent: "unknown", text };
}

// 🔸 선택적으로: NLU 서버형 API 호출 예시
// export async function analyzeViaAPI(text: string) {
//   try {
//     const res = await fetch(`/api/nlu/analyze`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text }),
//     });
//     return await res.json();
//   } catch (err) {
//     console.error("❌ NLU API Error:", err);
//     return { intent: "unknown", text };
//   }
// }
