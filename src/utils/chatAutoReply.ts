/**
 * 🤖 판매자 자동 응답 템플릿
 * 거래 성사 가속 장치
 */

import type { MarketProduct } from "@/types/market";
import type { ChatIntent } from "./chatIntentParser";

/**
 * 판매자 자동 응답 생성
 * 
 * @param intent - 채팅 의도
 * @param product - 상품 정보
 * @returns 자동 응답 텍스트
 */
export function generateSellerAutoReply(
  intent: ChatIntent,
  product: MarketProduct
): string {
  switch (intent) {
    case "availability":
      return "네 아직 판매 중입니다!";
    
    case "location": {
      const locationText = product.locationText || product.addressShort || product.dong || "근처";
      return `직거래는 ${locationText} 근처에서 가능합니다.`;
    }
    
    case "condition": {
      const condition = product.description || product.aiSummary || "상태 좋음";
      return `실사용은 거의 없고 ${condition}입니다.`;
    }
    
    case "price": {
      if (product.price && product.price > 0) {
        return `${product.price.toLocaleString()}원 생각하고 있습니다.`;
      }
      return "가격은 협의 가능합니다.";
    }
    
    case "schedule":
      return "오늘 저녁 시간대 가능합니다. 언제 편하신가요?";
    
    default:
      return "네, 말씀해 주세요!";
  }
}

/**
 * 거래 성사 가속 버튼 텍스트 (구매자용)
 */
export const BUYER_ACTION_BUTTONS = [
  { text: "📍 위치 제안", action: "location" },
  { text: "🕒 시간 제안", action: "schedule" },
  { text: "💰 가격 제안", action: "price" },
] as const;

/**
 * 거래 성사 가속 버튼 텍스트 (판매자용)
 */
export const SELLER_ACTION_BUTTONS = [
  { text: "✅ 거래 확정", action: "confirm" },
  { text: "📍 위치 보내기", action: "location" },
  { text: "🕒 시간 확정", action: "schedule" },
] as const;

