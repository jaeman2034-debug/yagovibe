// src/speech/IntentRouter.ts
// 🔥 Phase 6: Intent Router (A/B + Fallback)
// ✅ Rule-based → NLP 점진 전환, 언제든 롤백 가능

import type { Intent } from "./intents";
import { parseWithRules } from "./ruleParser";
import { parseWithNLP } from "./nlpParser";
import { logMetric } from "./telemetry";
import { isBlacklisted } from "./learning/blacklist";

// 🔥 NLP 설정 (환경 변수 기반)
const NLP_ENABLED = import.meta.env.VITE_NLP === "on";
const NLP_RATIO = parseFloat(import.meta.env.VITE_NLP_RATIO || "0.2"); // 기본 20%

/**
 * Intent Router (A/B + Fallback)
 * 
 * 🔒 불변 원칙:
 * 1. 항상 규칙 파서 먼저 시도 (빠름/무료)
 * 2. UNKNOWN일 때만 NLP 시도
 * 3. NLP 실패 시 무조건 규칙 파서로 fallback
 * 4. 1 STT 결과 → 1 Intent → stopAll (변경 없음)
 */
export async function routeIntent(text: string, pathname: string): Promise<Intent> {
  // 🔥 Phase 6-3: 블랙리스트 체크 (NLP 호출 전 차단, 비용 절약)
  if (isBlacklisted(text)) {
    return { type: "UNKNOWN", payload: {}, confidence: 0.0 };
  }

  // 🔥 Step 1: 항상 먼저 규칙 시도 (빠름/무료)
  const ruleIntent = parseWithRules(text);
  
  // 🔥 Step 2: 규칙으로 해결되면 즉시 반환 (NLP 불필요)
  // 🔥 Phase 6-2: Intent v2 스키마 (confidence 포함)
  if (ruleIntent.type !== "UNKNOWN" && ruleIntent.confidence >= 0.7) {
    return ruleIntent;
  }

  // 🔥 Step 3: NLP 조건 체크
  if (!NLP_ENABLED) {
    return ruleIntent; // NLP 비활성화 → 규칙만 사용
  }

  // 🔥 Step 4: NLP_RATIO 기반 A/B 테스트 (UNKNOWN만)
  if (Math.random() > NLP_RATIO) {
    return ruleIntent; // 규칙으로 처리 (A/B 테스트)
  }

  // 🔥 Step 5: NLP 시도 (UNKNOWN만)
  try {
    const nlpIntent = await parseWithNLP(text, pathname);
    
    if (nlpIntent && nlpIntent.type !== "UNKNOWN") {
      // NLP 성공
      logMetric({ type: "NLP_USED", ok: true, pathname });
      return nlpIntent;
    } else {
      // NLP 실패 또는 UNKNOWN → 규칙으로 fallback
      logMetric({ type: "NLP_USED", ok: false, pathname });
      return ruleIntent;
    }
  } catch (error) {
    // NLP 오류 → 무조건 규칙으로 fallback
    console.warn("[IntentRouter] NLP 오류, 규칙으로 fallback:", error);
    logMetric({ type: "NLP_USED", ok: false, pathname, error: String(error) });
    return ruleIntent;
  }
}

