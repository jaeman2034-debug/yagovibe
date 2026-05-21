// src/speech/intents.ts
// 🔥 Phase 6-2: Intent 스키마 v2 (엄격)
// ✅ LLM은 자유롭고, 앱은 엄격해야 한다

/**
 * Intent v2 (엄격한 스키마)
 * 
 * 불변 규칙:
 * - type는 ENUM
 * - payload 키는 intent별 고정
 * - confidence는 0~1 숫자
 */
export type Intent =
  | { type: "NAVIGATE"; payload: { to: string }; confidence: number }
  | { type: "SEARCH"; payload: { query: string }; confidence: number }
  | { type: "SCROLL"; payload: { direction: "up" | "down" }; confidence: number }
  | { type: "STOP"; payload: {}; confidence: number }
  | { type: "RECOMMEND"; payload: { key: string }; confidence: number }
  | { type: "CONFIRM_YES"; payload: {}; confidence: number }
  | { type: "CONFIRM_NO"; payload: {}; confidence: number }
  | { type: "UNKNOWN"; payload: {}; confidence: number };

/**
 * Intent 타입 검증 (클라이언트)
 */
export function isValidIntentType(type: string): type is Intent["type"] {
  return ["NAVIGATE", "SEARCH", "SCROLL", "STOP", "RECOMMEND", "CONFIRM_YES", "CONFIRM_NO", "UNKNOWN"].includes(type);
}

/**
 * Confidence 검증 (0~1)
 */
export function isValidConfidence(confidence: number): boolean {
  return typeof confidence === "number" && confidence >= 0 && confidence <= 1;
}
