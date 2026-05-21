// src/speech/recommendation/engine.ts
// 🔥 Phase 8: 추천 엔진 (아주 단순하게)
// ✅ 최근 사용 intent 기반 추천 생성

import type { UserVoiceProfile } from "../personalization/userProfile";

export interface Recommendation {
  key: string; // "NAVIGATE:/sports-hub?category=basketball"
  confidence: number;
  reason: string;
  question: string; // TTS 질문 텍스트
}

/**
 * 추천 후보 생성
 * 
 * 입력 신호:
 * - user_voice_profile.topIntents
 * - 최근 사용 시각
 * - 현재 pathname
 * 
 * 출력:
 * - 추천 후보 1개 (confidence ≥ 0.85)
 */
export function generateRecommendation(
  userProfile: UserVoiceProfile,
  currentPathname: string
): Recommendation | null {
  if (!userProfile.topIntents || Object.keys(userProfile.topIntents).length === 0) {
    return null;
  }

  // 🔥 최근 사용 intent 중 상위 1개 선택
  const sortedIntents = Object.entries(userProfile.topIntents)
    .sort((a, b) => b[1] - a[1]) // count 내림차순
    .filter(([key, count]) => count >= 2); // 최근 7일 내 2회 이상

  if (sortedIntents.length === 0) {
    return null;
  }

  const [topIntentKey, count] = sortedIntents[0];

  // 🔥 confidence 계산 (사용 빈도 기반)
  const confidence = Math.min(0.85 + (count - 2) * 0.05, 0.95); // 최대 0.95

  // 🔥 현재 페이지와 동일한 intent는 추천하지 않음
  if (topIntentKey.includes(currentPathname)) {
    return null;
  }

  // 🔥 질문 텍스트 생성 (간단한 휴리스틱)
  const question = generateQuestion(topIntentKey, count);

  return {
    key: topIntentKey,
    confidence,
    reason: "recent_frequency",
    question,
  };
}

/**
 * 질문 텍스트 생성 (간단한 휴리스틱)
 */
function generateQuestion(intentKey: string, count: number): string {
  // 🔥 Phase 8-2: 추천의 형태는 "질문형"만 허용
  // "요즘 농구 경기 많이 보고 있어요. 바로 보여드릴까요?"
  
  if (intentKey.startsWith("NAVIGATE:")) {
    const to = intentKey.replace("NAVIGATE:", "");
    
    // 스포츠 카테고리 추출
    const categoryMatch = to.match(/category=(\w+)/);
    if (categoryMatch) {
      const category = categoryMatch[1];
      const categoryNames: { [key: string]: string } = {
        basketball: "농구",
        football: "축구",
        baseball: "야구",
        running: "러닝",
        fitness: "헬스",
      };
      
      const categoryName = categoryNames[category] || category;
      return `요즘 ${categoryName} 경기 많이 보고 있어요. 바로 보여드릴까요?`;
    }
    
    return `자주 찾아보시는 페이지예요. 다시 열어드릴까요?`;
  }
  
  if (intentKey.startsWith("SEARCH:")) {
    const query = intentKey.replace("SEARCH:", "");
    return `"${query}" 검색을 자주 하시네요. 다시 검색해드릴까요?`;
  }
  
  return "자주 사용하시는 기능이에요. 다시 실행해드릴까요?";
}

