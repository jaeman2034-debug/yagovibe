/**
 * 🔍 채팅 자연어 의도 분류 (룰 기반)
 * AI 없이 빠르고 정확하게
 */

export type ChatIntent = 
  | "availability"  // 재고/상태 확인
  | "price"        // 가격 흥정
  | "location"     // 거래 위치
  | "condition"    // 상품 상태
  | "schedule"     // 시간 조율
  | "etc";         // 기타

/**
 * 채팅 메시지 의도 파싱
 * 
 * @param text - 사용자 메시지
 * @returns 의도 타입
 */
export function parseChatIntent(text: string): ChatIntent {
  const lowerText = text.toLowerCase();
  
  // 재고/상태 확인
  if (
    lowerText.includes("있") ||
    lowerText.includes("판매") ||
    lowerText.includes("팔렸") ||
    lowerText.includes("재고")
  ) {
    return "availability";
  }
  
  // 가격 흥정
  if (
    lowerText.includes("얼마") ||
    lowerText.includes("가격") ||
    lowerText.includes("비싸") ||
    lowerText.includes("싸게") ||
    lowerText.includes("할인") ||
    lowerText.includes("깎") ||
    lowerText.includes("협의")
  ) {
    return "price";
  }
  
  // 거래 위치
  if (
    lowerText.includes("어디") ||
    lowerText.includes("위치") ||
    lowerText.includes("직거래") ||
    lowerText.includes("만나") ||
    lowerText.includes("장소")
  ) {
    return "location";
  }
  
  // 상품 상태
  if (
    lowerText.includes("상태") ||
    lowerText.includes("사용") ||
    lowerText.includes("깨끗") ||
    lowerText.includes("새거") ||
    lowerText.includes("중고")
  ) {
    return "condition";
  }
  
  // 시간 조율
  if (
    lowerText.includes("오늘") ||
    lowerText.includes("내일") ||
    lowerText.includes("언제") ||
    lowerText.includes("시간") ||
    lowerText.includes("가능")
  ) {
    return "schedule";
  }
  
  return "etc";
}

