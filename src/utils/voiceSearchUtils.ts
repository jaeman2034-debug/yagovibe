// src/utils/voiceSearchUtils.ts
// 🔥 음성 검색 유틸리티 (체육인 말투 대응)

/**
 * 체육인 말투를 표준 검색어로 변환
 * 
 * 예시:
 * "러닝화 270 있어?" → "러닝화 270"
 * "헬스 벤치 찾아줘" → "헬스 벤치"
 * "축구화 싸게 파는 거" → "축구화"
 */
export function normalizeVoiceQuery(text: string): string {
  let normalized = text.trim();
  
  // 1. 질문 어미 제거
  normalized = normalized
    .replace(/있어\?/g, "")
    .replace(/있나요\?/g, "")
    .replace(/있어요\?/g, "")
    .replace(/있나\?/g, "")
    .replace(/있지\?/g, "")
    .replace(/있냐\?/g, "")
    .trim();
  
  // 2. 명령형 어미 제거
  normalized = normalized
    .replace(/해줘/g, "")
    .replace(/찾아줘/g, "")
    .replace(/보여줘/g, "")
    .replace(/알려줘/g, "")
    .replace(/가져와줘/g, "")
    .trim();
  
  // 3. 체육인 특화 표현 정리
  normalized = normalized
    .replace(/파는\s*거/g, "") // "파는 거" 제거
    .replace(/팔아요/g, "")
    .replace(/팔아/g, "")
    .replace(/판매/g, "")
    .trim();
  
  // 4. 불필요한 조사 제거
  normalized = normalized
    .replace(/\s+거\s*$/g, "") // 끝의 "거" 제거
    .replace(/\s+것\s*$/g, "") // 끝의 "것" 제거
    .trim();
  
  // 5. 연속된 공백 정리
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  return normalized || text; // 정리된 게 없으면 원본 반환
}

/**
 * 음성 인식 에러를 사용자 친화적 메시지로 변환
 */
export function getVoiceErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    "no-speech": "음성이 감지되지 않았어요. 다시 말해볼까요?",
    "audio-capture": "마이크에 접근할 수 없어요. 마이크가 연결되어 있는지 확인해주세요.",
    "not-allowed": "마이크 권한이 필요해요. 브라우저 설정에서 마이크를 허용해주세요.",
    "network": "네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요.",
    "aborted": "음성 인식이 중단되었어요.",
    "service-not-allowed": "음성 인식 서비스를 사용할 수 없어요.",
  };
  
  return errorMap[error] || "음성 인식 중 문제가 발생했어요. 다시 시도해주세요.";
}

/**
 * 음성 인식 지원 여부 확인
 */
export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== "undefined" && (
    "SpeechRecognition" in window || 
    "webkitSpeechRecognition" in window
  );
}

