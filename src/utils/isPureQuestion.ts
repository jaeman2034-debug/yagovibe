/**
 * 순수 질문 감지 유틸리티
 * 
 * 규칙 기반 Intent로 처리할 수 없는 고급 자연어 질문을 감지합니다.
 * 이런 질문들은 AI 추론 레이어(LLM)로 넘겨야 합니다.
 */

/**
 * 텍스트가 순수 질문(분석/설명 요청)인지 확인합니다.
 * 
 * @param text - 분석할 텍스트
 * @returns 순수 질문이면 true, 아니면 false
 */
export function isPureQuestion(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  const t = text.toLowerCase().trim();

  // 질문 패턴 감지
  const questionPatterns = [
    "어때",           // "손흥민 요즘 폼 어때?"
    "어떤",           // "어떤 경기 보는 게 좋을까?"
    "누가",           // "누가 제일 잘 나가?"
    "누구",           // "누구야?"
    "뭐가 좋",        // "뭐가 좋을까?"
    "추천",           // "경기 추천해줘"
    "알려줘",         // "요즘 폼 알려줘" (단, 기존 Intent에 안 걸린 경우)
    "어떻게",         // "어떻게 되고 있어?"
    "어떠",           // "어떠세요?"
    "?",              // 물음표로 끝나는 경우
  ];

  // 질문 패턴이 포함되어 있는지 확인
  const hasQuestionPattern = questionPatterns.some((pattern) => t.includes(pattern));

  // 비교/분석 요청 패턴
  const analysisPatterns = [
    "중에",           // "메시랑 호날두 중에"
    "비교",           // "비교해줘"
    "최근",           // "최근 5경기"
    "요즘",           // "요즘 폼"
    "이번 시즌",      // "이번 시즌 제일"
    "제일",           // "제일 잘 나가는"
    "가장",           // "가장 좋은"
    "성적",           // "성적 어때?"
    "폼",             // "폼 어때?"
  ];

  const hasAnalysisPattern = analysisPatterns.some((pattern) => t.includes(pattern));

  // 질문 패턴이 있거나 분석 요청 패턴이 있으면 순수 질문으로 판단
  return hasQuestionPattern || hasAnalysisPattern;
}

