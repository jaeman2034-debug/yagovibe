/**
 * 🔥 상태 기반 UI 표시 규칙 (STEP 5 LOCK)
 * 
 * 핵심 원칙:
 * - 게스트에게는 '가능성'을 보여주고, 회원에게는 '즉시 실행'을 준다
 * - UI는 유혹해야지 차단하면 안 된다
 * - 버튼은 숨기지 않는다
 * - 비활성(disabled)은 최소화
 * - 클릭 → 그 순간에만 막고 연결한다
 */

import { getUserState, UserState } from "./userState";

/**
 * 상태 판별 함수 (UI 단일 진실)
 * 
 * 모든 UI 분기는 이 한 줄만 사용
 */
export function isGuest(): boolean {
  return getUserState() === "GUEST";
}

export function isMember(): boolean {
  return getUserState() === "MEMBER";
}

/**
 * 기능별 UI 표시 규칙
 * 
 * 🟢 항상 보여준다 (Guest / Member 동일)
 * - 상품 카드
 * - 상품 상세 버튼
 * - 가격/사진
 * - 채팅 목록(읽기)
 * - 판매자 정보
 * 
 * 🟡 클릭은 가능, 행동 시 가입 유도
 * - "채팅 보내기" 버튼
 * - "판매하기" 버튼
 * - "찜" 버튼
 * - "거래 요청"
 * 
 * 🔴 회원 전용 (게스트에겐 미노출)
 * - 결제 진행 버튼
 * - 배송지 입력
 * - 계정 설정
 */

/**
 * 항상 보여줄 UI 요소인지 확인
 */
export function shouldAlwaysShow(feature: "product-card" | "product-detail" | "price-photo" | "chat-list" | "seller-info"): boolean {
  // 모든 항상 보여줄 기능은 Guest/Member 동일하게 표시
  return true;
}

/**
 * 클릭 시 가입 유도가 필요한 UI 요소인지 확인
 */
export function requiresAuthOnClick(feature: "send-chat" | "create-listing" | "add-favorite" | "request-trade"): boolean {
  // 게스트면 클릭 시 가입 필요, 회원이면 바로 실행
  return isGuest();
}

/**
 * 회원 전용 UI 요소인지 확인 (게스트에겐 미노출)
 */
export function isMemberOnly(feature: "payment" | "shipping-address" | "account-settings"): boolean {
  // 회원만 보여줌
  return isMember();
}

/**
 * 버튼 활성/비활성 상태 결정
 * 
 * ❌ 하지 말 것:
 * - disabled 버튼 + "로그인 필요"
 * - 회색 처리 + 클릭 불가
 * 
 * ⭕ 정답 패턴:
 * - 활성 버튼
 * - 클릭 시 Lazy Signup 모달 (게스트) / 즉시 실행 (회원)
 */
export function getButtonState(feature: "send-chat" | "create-listing" | "add-favorite" | "request-trade"): {
  disabled: boolean;
  requiresAuth: boolean;
} {
  const guest = isGuest();
  
  return {
    disabled: false, // 항상 활성 (클릭 가능)
    requiresAuth: guest, // 게스트면 가입 필요, 회원이면 바로 실행
  };
}

/**
 * CTA 문구 규칙
 * 
 * 같은 버튼, 다른 행동
 * - Guest: 채팅 보내기 → 클릭 시 Lazy Signup
 * - Member: 채팅 보내기 → 즉시 입력창 포커스
 * 
 * 👉 문구를 바꾸지 않는다 → 클릭 결과만 다름
 */
export function getButtonLabel(feature: "send-chat" | "create-listing" | "add-favorite" | "request-trade"): string {
  // Guest/Member 동일한 문구 사용
  const labels = {
    "send-chat": "채팅 보내기",
    "create-listing": "판매하기",
    "add-favorite": "찜",
    "request-trade": "거래 요청",
  };
  
  return labels[feature];
}

/**
 * 상태 기반 배너/안내 (최소 허용)
 * 
 * 허용되는 단 하나의 배너 (선택):
 * "지금 가입하면 바로 거래를 시작할 수 있어요"
 * 
 * ❌ 반복 노출
 * ❌ 강제 노출
 */
export function shouldShowSignupBanner(): boolean {
  // 최소 허용: 게스트이고, 첫 방문일 때만 (선택적)
  // 실제 구현 시 localStorage 체크 등 추가 가능
  return isGuest();
}

export function getSignupBannerMessage(): string {
  return "지금 가입하면\n바로 거래를 시작할 수 있어요";
}

