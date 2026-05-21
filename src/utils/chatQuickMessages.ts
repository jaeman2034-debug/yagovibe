/**
 * 💬 채팅 퀵 메시지 생성
 * 거래 성사 가속 장치
 */

import type { MarketProduct } from "@/types/market";

/**
 * 구매자용 퀵 메시지 생성
 * 상품 정보 기반으로 자동 생성
 */
export interface QuickMessage {
  text: string;
  intent: "availability" | "condition" | "location" | "price" | "schedule";
  icon: string;
}

export function generateBuyerQuickMessages(product: MarketProduct): QuickMessage[] {
  const messages: QuickMessage[] = [];

  // 1. 재고/상태 확인
  messages.push({
    text: "아직 판매 중인가요?",
    intent: "availability",
    icon: "💬",
  });

  // 2. 상태 확인 (상품 정보에 상태가 있으면)
  if (product.description || product.aiSummary) {
    messages.push({
      text: "실사용감 어느 정도인가요?",
      intent: "condition",
      icon: "🔍",
    });
  }

  // 3. 위치 확인 (위치 정보가 있으면)
  if (product.locationText || product.addressShort || product.dong) {
    const locationText = product.locationText || product.addressShort || product.dong || "근처";
    messages.push({
      text: `직거래 위치가 어디쯤인가요?`,
      intent: "location",
      icon: "📍",
    });
  }

  // 4. 가격 흥정 (가격이 있으면)
  if (product.price && product.price > 0) {
    messages.push({
      text: "가격 조정 가능할까요?",
      intent: "price",
      icon: "💸",
    });
  }

  // 5. 시간 조율
  messages.push({
    text: "오늘 거래 가능할까요?",
    intent: "schedule",
    icon: "🕒",
  });

  return messages;
}

