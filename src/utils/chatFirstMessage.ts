/**
 * 💬 채팅 첫 메시지 자동 생성
 * 거래 성사 가속 장치 - "뭐부터 말하지?" 고민 제거
 */

import type { MarketProduct } from "@/types/market";

/**
 * 상품 정보 기반 첫 메시지 생성
 * 구매자 입장에서 자연스러운 첫 인사 + 거래 의도 표현
 */
export function generateFirstMessage(product: MarketProduct): string {
  const productName = product.name || product.title || "상품";
  const price = product.price ? `${product.price.toLocaleString()}원` : null;
  
  // 기본 템플릿 (가장 자연스러운 형태)
  let message = `안녕하세요! ${productName} 보고 연락드렸어요 😊\n`;
  
  // 가격이 있으면 가격 언급 추가
  if (price) {
    message += `아직 판매 중이면 거래 가능할까요?`;
  } else {
    message += `아직 판매 중인가요?`;
  }
  
  return message;
}

/**
 * 상품 카테고리별 맞춤 첫 메시지 (선택적)
 */
export function generateFirstMessageByCategory(product: MarketProduct): string {
  const productName = product.name || product.title || "상품";
  const category = product.category || "";
  const price = product.price ? `${product.price.toLocaleString()}원` : null;
  
  // 카테고리별 맞춤 메시지
  if (category.includes("러닝") || category.includes("운동화")) {
    return `안녕하세요! ${productName} 보고 연락드렸어요 🏃\n사이즈와 상태 괜찮으면 거래 희망합니다!`;
  }
  
  if (category.includes("헬스") || category.includes("웨이트")) {
    return `안녕하세요! ${productName} 보고 연락드렸어요 💪\n직거래 가능하시면 거래 희망합니다!`;
  }
  
  if (category.includes("자전거")) {
    return `안녕하세요! ${productName} 보고 연락드렸어요 🚴\n직거래 가능하시면 거래 희망합니다!`;
  }
  
  // 기본 메시지
  return generateFirstMessage(product);
}

