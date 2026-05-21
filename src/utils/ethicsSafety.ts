/**
 * 🔥 윤리/안전 레이어 (천재 모드 2.6)
 * 
 * 역할:
 * - 똑똑하면서도 과하지 않게
 * - 안전한 장소만 추천
 * - 책임 있는 추천
 */

import type { MapPlace } from "@/types/map";
import type { LongMemory } from "./longMemory";
import { calculateConfidence, type ConfidenceContext } from "./selfCorrection";

/**
 * 🔥 겸손 표현 (과신 금지)
 */
export function generateHumility(confidence: number): string {
  if (confidence < 0.4) {
    return "아직 학습 중이라 참고만 해주세요 🙏";
  }

  if (confidence < 0.6) {
    return "아직 확신은 약하지만 시도해볼 만해요";
  }

  if (confidence < 0.8) {
    return "꽤 괜찮은 선택일 거예요";
  }

  // 🔥 v2.6: 신뢰도가 높아도 겸손 유지
  if (confidence < 0.95) {
    return "잘 맞을 거예요 ✨";
  }

  // 🔥 신뢰도가 매우 높아도 완벽하지 않다는 인정
  return "";
}

/**
 * 🔥 안전 필터
 */
export function safeFilter(place: MapPlace): boolean {
  // 🔥 v2.6: 성인 콘텐츠 필터링
  if (place.tags?.includes("adult") || place.tags?.includes("성인")) {
    return false;
  }

  // 🔥 v2.6: 폐업한 장소 필터링
  if (place.closed || place.status === "closed") {
    return false;
  }

  // 🔥 v2.6: 위험한 태그 필터링
  const dangerousTags = ["dangerous", "위험", "unsafe", "불안전"];
  if (place.tags?.some(tag => dangerousTags.includes(tag.toLowerCase()))) {
    return false;
  }

  // 🔥 v2.6: 평점이 너무 낮은 장소 필터링 (1.0 미만)
  if (place.rating && place.rating < 1.0) {
    return false;
  }

  // 🔥 v2.6: 이름에 부적절한 키워드가 있는 경우 필터링
  const inappropriateKeywords = ["성인", "adult", "nightclub", "나이트클럽"];
  const placeName = (place.name || "").toLowerCase();
  if (inappropriateKeywords.some(keyword => placeName.includes(keyword))) {
    return false;
  }

  return true;
}

/**
 * 🔥 안전 필터 적용
 */
export function applySafeFilter(places: MapPlace[]): MapPlace[] {
  return places.filter(place => safeFilter(place));
}

/**
 * 🔥 윤리적 문장 생성
 */
export function generateEthicalSentence(
  baseSentence: string,
  confidence: number
): string {
  const humilityMessage = generateHumility(confidence);

  if (!humilityMessage || humilityMessage === "") {
    return baseSentence;
  }

  // 🔥 v2.6: 겸손 메시지를 문장 끝에 추가
  return `${baseSentence}\n\n${humilityMessage}`;
}

/**
 * 🔥 책임 있는 추천 확인
 */
export function isResponsibleRecommendation(
  place: MapPlace,
  confidence: number
): boolean {
  // 🔥 v2.6: 안전 필터 통과 확인
  if (!safeFilter(place)) {
    return false;
  }

  // 🔥 v2.6: 신뢰도가 너무 낮으면 추천하지 않음
  if (confidence < 0.3) {
    return false;
  }

  return true;
}

/**
 * 🔥 윤리적 코스 생성
 */
export function generateEthicalCourse(
  places: MapPlace[],
  confidenceContext: ConfidenceContext
): MapPlace[] {
  // 🔥 v2.6: 안전 필터 적용
  const safePlaces = applySafeFilter(places);

  // 🔥 v2.6: 책임 있는 추천만 필터링
  // 이미 파일 상단에서 import된 calculateConfidence 사용
  const confidence = calculateConfidence(confidenceContext);

  return safePlaces.filter(place => 
    isResponsibleRecommendation(place, confidence)
  );
}
