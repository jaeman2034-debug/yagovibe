/**
 * 🔥 성장 & 전환 추적 이벤트 (STEP 6 LOCK)
 * 
 * 핵심 원칙:
 * - 이벤트 수는 적을수록 강하다
 * - 모든 이벤트는 "의도" 중심
 * - 로그는 분석가가 아니라 PM/대표가 바로 읽을 수 있어야 한다
 * - "있으면 좋은 이벤트" ❌ → "결정에 쓰는 이벤트" ⭕
 */

/**
 * 전체 이벤트 맵 (초기 LOCK)
 * 
 * 이 플랫폼에서 반드시 필요한 이벤트는 딱 7개다.
 */

/**
 * QR 관련 이벤트 (바이럴 측정 핵심)
 */
export interface QREnteredEvent {
  event: "qr_entered";
  type: "item" | "chat" | "market" | "seller";
  id: string | null; // ITEM_ID | CHAT_ID | null
  is_guest: boolean;
  utm?: string; // 추후 분석용 (옵션)
}

/**
 * 게스트 행동 이벤트 (가치 경험 측정)
 */
export interface GuestViewEvent {
  event: "guest_view";
  screen: "market" | "item" | "chat";
}

/**
 * Lazy Signup 트리거 이벤트 (전환 직전)
 */
export interface AuthRequiredEvent {
  event: "auth_required";
  action: "send_chat" | "sell" | "like" | "order";
}

/**
 * 가입 이벤트 (전환 성공)
 */
export interface SignupStartedEvent {
  event: "signup_started";
  method: "phone" | "google" | "apple";
}

export interface SignupCompletedEvent {
  event: "signup_completed";
  method: "phone" | "google" | "apple";
}

/**
 * 복귀 성공 이벤트 (UX 품질 핵심)
 */
export interface PostSignupResumedEvent {
  event: "post_signup_resumed";
  action: "send_chat" | "sell" | "like" | "order";
}

/**
 * 회원 행동 이벤트 (실제 가치)
 */
export interface MemberActionEvent {
  event: "member_action";
  action: "send_chat" | "sell" | "order";
}

/**
 * 통합 이벤트 타입
 */
export type GrowthEvent =
  | QREnteredEvent
  | GuestViewEvent
  | AuthRequiredEvent
  | SignupStartedEvent
  | SignupCompletedEvent
  | PostSignupResumedEvent
  | MemberActionEvent;

/**
 * 이벤트 추적 함수
 * 
 * 사용 예시:
 * ```typescript
 * trackGrowthEvent({
 *   event: "qr_entered",
 *   type: "item",
 *   id: "ITEM_123",
 *   is_guest: true
 * });
 * ```
 * 
 * 실제 구현은 Firebase Analytics, Segment, GA 등으로 연결
 */
export function trackGrowthEvent(event: GrowthEvent): void {
  try {
    // 🔥 기존 analytics 시스템에 연결
    import("./analytics").then((module) => {
      if (module.track) {
        module.track(event.event, event);
      }
    }).catch(() => {
      // analytics.ts가 없거나 로드 실패 시 console 로깅 (개발 환경)
      if (import.meta.env.DEV) {
        console.log("📊 [GrowthEvent]", event);
      }
    });
  } catch (error) {
    console.error("❌ [trackGrowthEvent] 이벤트 추적 실패:", error);
  }
}

/**
 * 편의 함수들 (의도 중심)
 */

/**
 * QR 진입 추적
 */
export function trackQREntered(
  type: "item" | "chat" | "market" | "seller",
  id: string | null,
  isGuest: boolean,
  utm?: string
): void {
  trackGrowthEvent({
    event: "qr_entered",
    type,
    id,
    is_guest: isGuest,
    utm,
  });
}

/**
 * 게스트 화면 조회 추적
 */
export function trackGuestView(screen: "market" | "item" | "chat"): void {
  trackGrowthEvent({
    event: "guest_view",
    screen,
  });
}

/**
 * 인증 필요 추적 (Lazy Signup 트리거)
 */
export function trackAuthRequired(action: "send_chat" | "sell" | "like" | "order"): void {
  trackGrowthEvent({
    event: "auth_required",
    action,
  });
}

/**
 * 가입 시작 추적
 */
export function trackSignupStarted(method: "phone" | "google" | "apple"): void {
  trackGrowthEvent({
    event: "signup_started",
    method,
  });
}

/**
 * 가입 완료 추적
 */
export function trackSignupCompleted(method: "phone" | "google" | "apple"): void {
  trackGrowthEvent({
    event: "signup_completed",
    method,
  });
}

/**
 * 가입 후 복귀 추적
 */
export function trackPostSignupResumed(action: "send_chat" | "sell" | "like" | "order"): void {
  trackGrowthEvent({
    event: "post_signup_resumed",
    action,
  });
}

/**
 * 회원 행동 추적
 */
export function trackMemberAction(action: "send_chat" | "sell" | "order"): void {
  trackGrowthEvent({
    event: "member_action",
    action,
  });
}

