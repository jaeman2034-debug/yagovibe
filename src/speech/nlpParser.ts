// src/speech/nlpParser.ts
// 🔥 Phase 6: NLP-based Intent Parser (LLM via Edge Function)
// ✅ 비용/지연/프라이버시 통제

import type { Intent } from "./intents";

/**
 * NLP 기반 Intent 파서 (Edge Function 호출)
 * 
 * 🔒 가드:
 * - 타임아웃 800ms
 * - confidence < 0.7 → discard (Phase 6-2: Confidence 게이트)
 * - 실패 시 null 반환 (fallback으로 규칙 파서 사용)
 */
const MIN_CONFIDENCE = 0.7; // 🔥 Phase 6-2: Confidence 게이트

export async function parseWithNLP(text: string, pathname: string): Promise<Intent | null> {
  // 🔥 비용/지연 가드: 짧은 문장만 (40자 제한)
  if (text.length > 40) {
    console.warn("[NLP] 텍스트가 너무 깁니다 (40자 제한):", text.length);
    return null;
  }

  try {
    // 🔥 타임아웃 800ms
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);

    // 🔥 Firebase Functions 엔드포인트 (배포 후 실제 URL로 변경)
    // 로컬: http://localhost:5001/yago-vibe-spt/us-central1/intent
    // 프로덕션: https://us-central1-yago-vibe-spt.cloudfunctions.net/intent
    const apiUrl = import.meta.env.DEV
      ? "http://localhost:5001/yago-vibe-spt/us-central1/intent"
      : "https://us-central1-yago-vibe-spt.cloudfunctions.net/intent";

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, pathname }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn("[NLP] Edge Function 응답 실패:", res.status);
      return null;
    }

    const json = await res.json();

    // 🔥 Phase 6-2: Confidence 게이트 (0.7 미만 → 무조건 폐기)
    const confidence = json.confidence ?? 0.0;
    if (confidence < MIN_CONFIDENCE) {
      console.warn("[NLP] 신뢰도 부족 (폐기):", confidence);
      return null;
    }

    return mapToIntent(json);
  } catch (error: any) {
    // 타임아웃 또는 네트워크 오류
    if (error.name === "AbortError") {
      console.warn("[NLP] 타임아웃 (800ms 초과)");
    } else {
      console.warn("[NLP] 파싱 실패:", error.message);
    }
    return null;
  }
}

/**
 * Edge Function 응답을 Intent로 변환
 */
/**
 * Edge Function 응답을 Intent v2로 변환
 */
function mapToIntent(json: any): Intent | null {
  if (!json.type || !json.payload) {
    return null;
  }

  const confidence = json.confidence ?? 0.0;

  switch (json.type) {
    case "NAVIGATE":
      return {
        type: "NAVIGATE",
        payload: { to: json.payload.to || "/sports-hub" },
        confidence,
      };
    case "SEARCH":
      return {
        type: "SEARCH",
        payload: { query: json.payload.query || "" },
        confidence,
      };
    case "SCROLL":
      return {
        type: "SCROLL",
        payload: {
          direction: json.payload.direction === "down" ? "down" : "up",
        },
        confidence,
      };
    case "STOP":
      return { type: "STOP", payload: {}, confidence };
    case "UNKNOWN":
      return { type: "UNKNOWN", payload: {}, confidence };
    default:
      return null;
  }
}

