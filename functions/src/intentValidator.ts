// functions/src/intentValidator.ts
// 🔥 Phase 6-2: 서버 측 JSON 검증 (Zod 기반)
// ✅ LLM을 절대 믿지 않는다. 서버에서 스키마 검증 → 아니면 UNKNOWN

/**
 * Intent 스키마 검증 (Zod 없이 순수 TypeScript)
 * 
 * 불변 규칙:
 * - type는 ENUM
 * - payload 키는 intent별 고정
 * - confidence는 0~1 숫자
 */
export function validateIntent(json: any): {
  intent: string;
  payload: any;
  confidence: number;
} {
  // 🔥 기본 검증
  if (!json || typeof json !== "object") {
    return { intent: "UNKNOWN", payload: {}, confidence: 0 };
  }

  // 🔥 type 검증 (ENUM)
  const validTypes = ["NAVIGATE", "SEARCH", "SCROLL", "STOP", "UNKNOWN"];
  const type = json.intent || json.type;
  if (!type || !validTypes.includes(type)) {
    return { intent: "UNKNOWN", payload: {}, confidence: 0 };
  }

  // 🔥 payload 검증
  const payload = json.payload || {};
  if (typeof payload !== "object") {
    return { intent: "UNKNOWN", payload: {}, confidence: 0 };
  }

  // 🔥 intent별 payload 스키마 검증
  switch (type) {
    case "NAVIGATE":
      if (!payload.to || typeof payload.to !== "string") {
        return { intent: "UNKNOWN", payload: {}, confidence: 0 };
      }
      break;
    case "SEARCH":
      if (payload.query === undefined || typeof payload.query !== "string") {
        return { intent: "UNKNOWN", payload: {}, confidence: 0 };
      }
      break;
    case "SCROLL":
      if (!payload.direction || !["up", "down"].includes(payload.direction)) {
        return { intent: "UNKNOWN", payload: {}, confidence: 0 };
      }
      break;
    case "STOP":
      // payload는 빈 객체
      break;
    case "UNKNOWN":
      // payload는 빈 객체
      break;
  }

  // 🔥 confidence 검증 (0~1)
  let confidence = json.confidence;
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    confidence = 0.5; // 기본값
  }

  return {
    intent: type,
    payload,
    confidence,
  };
}

