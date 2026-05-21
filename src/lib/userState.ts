/**
 * 🔥 게스트/회원 상태 플래그 설계 (STEP 1 LOCK)
 * 
 * 핵심 원칙:
 * - 상태는 딱 2개만: "GUEST" | "MEMBER"
 * - 복잡해지는 순간 망한다
 * - 인증 토큰만 보면 끝
 */

import { auth } from "@/lib/firebase";
import type { User } from "firebase/auth";

/**
 * 사용자 상태 타입 (절대 바뀌지 않는 기준)
 */
export type UserState = "GUEST" | "MEMBER";

/**
 * 프론트엔드 상태 판별 규칙 (즉시 적용 가능)
 * 
 * 조건:
 * - 인증 토큰 없음 → GUEST
 * - 인증 토큰 있음 → MEMBER
 * 
 * ❗ 전화번호 인증 여부, 프로필 완성 여부는 상태에 영향을 주지 않는다
 */
export function getUserState(): UserState {
  return auth.currentUser ? "MEMBER" : "GUEST";
}

/**
 * 현재 인증된 사용자 반환 (없으면 null)
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Lazy Signup 트리거 연결 방식
 * 
 * 행동 시도 시 인증 여부를 체크하고,
 * GUEST면 가입 모달을 열고,
 * MEMBER면 바로 액션을 실행한다.
 * 
 * 사용 예시:
 * ```tsx
 * requireAuth(() => {
 *   sendMessage(itemId);
 * });
 * 
 * requireAuth(() => {
 *   openSellForm();
 * });
 * ```
 */
export type PostSignupAction = {
  type: string;
  payload?: any;
};

export function requireAuth(
  action: () => void,
  actionContext?: PostSignupAction
): void {
  if (getUserState() === "MEMBER") {
    // 이미 회원이면 바로 실행
    action();
  } else {
    // 게스트면 가입 전 행동 저장 후 가입 모달 열기
    if (actionContext) {
      savePostSignupAction(actionContext);
    }
    openSignupModal();
  }
}

/**
 * "가입 후 복귀"를 보장하는 구조
 * 
 * ❗ localStorage ❌
 * ❗ sessionStorage ⭕
 * (브라우저 세션 종료 시 자연스럽게 사라져야 함)
 */
const POST_SIGNUP_ACTION_KEY = "postSignupAction_v1";

/**
 * 가입 후 복귀할 액션을 sessionStorage에 저장
 */
export function savePostSignupAction(action: PostSignupAction): void {
  try {
    sessionStorage.setItem(POST_SIGNUP_ACTION_KEY, JSON.stringify(action));
  } catch (e) {
    console.warn("❌ [userState] sessionStorage 저장 실패:", e);
  }
}

/**
 * 가입 후 복귀할 액션을 sessionStorage에서 조회
 */
export function getPostSignupAction(): PostSignupAction | null {
  try {
    const stored = sessionStorage.getItem(POST_SIGNUP_ACTION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PostSignupAction;
  } catch (e) {
    console.warn("❌ [userState] sessionStorage 조회 실패:", e);
    return null;
  }
}

/**
 * 가입 후 복귀 액션 실행 후 정리
 */
export function clearPostSignupAction(): void {
  try {
    sessionStorage.removeItem(POST_SIGNUP_ACTION_KEY);
  } catch (e) {
    console.warn("❌ [userState] sessionStorage 삭제 실패:", e);
  }
}

/**
 * 가입 모달 열기 (전역 이벤트 또는 상태 관리 필요)
 * 
 * 실제 구현은 앱 구조에 따라 다를 수 있음:
 * - 전역 상태 관리 (Zustand, Redux)
 * - 전역 이벤트 (CustomEvent)
 * - React Context
 */
function openSignupModal(): void {
  // 🔥 실제 구현은 앱 구조에 맞게 조정 필요
  // 예시: window.dispatchEvent(new CustomEvent("open-signup-modal"));
  
  // 현재는 console만 남기고, 실제 모달은 별도 컴포넌트에서 처리
  console.log("🔒 [userState] 가입 모달 열기 필요");
}

/**
 * 행동 기준 매트릭스 헬퍼 함수들
 * 
 * "보는 것"과 "하는 것"을 분리
 */
export const GuestPermissions = {
  /**
   * GUEST 허용 행동 (가치 경험)
   */
  canViewMarket: (): boolean => true,
  canViewItemDetail: (): boolean => true,
  canSearch: (): boolean => true,
  canReadChat: (): boolean => true,

  /**
   * GUEST 제한 행동 (행동 시점에 가입)
   */
  canSendMessage: (): boolean => false,
  canCreateListing: (): boolean => false,
  canAddFavorite: (): boolean => false,
  canRequestTrade: (): boolean => false,
  canMakePayment: (): boolean => false,
} as const;

/**
 * MEMBER는 모든 행동 가능
 */
export const MemberPermissions = {
  canViewMarket: (): boolean => true,
  canViewItemDetail: (): boolean => true,
  canSearch: (): boolean => true,
  canReadChat: (): boolean => true,
  canSendMessage: (): boolean => true,
  canCreateListing: (): boolean => true,
  canAddFavorite: (): boolean => true,
  canRequestTrade: (): boolean => true,
  canMakePayment: (): boolean => true,
} as const;

/**
 * 현재 사용자 상태에 따른 권한 반환
 */
export function getPermissions() {
  return getUserState() === "MEMBER" ? MemberPermissions : GuestPermissions;
}

