/**
 * 🔥 행동 버튼 컴포넌트 (STEP 5 LOCK)
 * 
 * 핵심 원칙:
 * - 버튼은 숨기지 않는다
 * - 비활성(disabled)은 최소화
 * - 클릭 시 Lazy Signup (게스트) / 즉시 실행 (회원)
 * - "못 합니다" ❌ → "계속하려면 가입" ⭕
 */

import { ReactNode } from "react";
import { requireAuth, PostSignupAction } from "@/lib/userState";
import { getButtonLabel, getButtonState } from "@/lib/uiRules";

interface ActionButtonProps {
  /**
   * 기능 타입
   */
  feature: "send-chat" | "create-listing" | "add-favorite" | "request-trade";
  
  /**
   * 클릭 시 실행할 액션 (회원일 때만 실행)
   */
  onAction: () => void;
  
  /**
   * 가입 후 복귀할 액션 컨텍스트 (선택)
   */
  actionContext?: PostSignupAction;
  
  /**
   * 버튼 스타일 커스텀 (선택)
   */
  className?: string;
  
  /**
   * 버튼 내용 커스텀 (선택, 없으면 기본 문구 사용)
   */
  children?: ReactNode;
  
  /**
   * 추가 props
   */
  [key: string]: any;
}

/**
 * 행동 버튼 컴포넌트
 * 
 * 사용 예시:
 * ```tsx
 * <ActionButton
 *   feature="send-chat"
 *   onAction={() => {
 *     // 채팅 보내기 실행
 *     sendMessage(chatId, message);
 *   }}
 *   actionContext={{
 *     type: "SEND_CHAT",
 *     payload: { chatId, message }
 *   }}
 * />
 * ```
 * 
 * 동작:
 * - 게스트: 클릭 → Lazy Signup 모달
 * - 회원: 클릭 → onAction 즉시 실행
 */
export function ActionButton({
  feature,
  onAction,
  actionContext,
  className = "",
  children,
  ...props
}: ActionButtonProps) {
  const { disabled, requiresAuth } = getButtonState(feature);
  const defaultLabel = getButtonLabel(feature);
  
  const handleClick = () => {
    // requireAuth가 게스트면 모달 열고, 회원이면 바로 실행
    requireAuth(onAction, actionContext);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      {...props}
    >
      {children || defaultLabel}
    </button>
  );
}

