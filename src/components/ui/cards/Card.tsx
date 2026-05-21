/**
 * 🔥 공용 Card 컴포넌트 (STEP 15B: variant 봉인)
 * 
 * STEP 15B 설계 원칙:
 * - Variant 4개만 허용 (info, summary, hint, action)
 * - 규칙 자동 강제
 * - action 버튼은 action 카드에서만
 * - PersonaSection에 action 카드 넣으면 코드 리뷰에서 즉시 보임
 */

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type CardVariant = "info" | "summary" | "hint" | "action";

interface CardProps {
  variant: CardVariant;
  icon?: ReactNode;
  title?: string;
  primaryText?: string;
  subText?: string;
  children?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onClick?: () => void;
  className?: string;
  disabled?: boolean; // action 버튼 비활성화
}

/**
 * 🔥 Card 컴포넌트
 * 
 * Variant별 특징:
 * - info: 기본 정보, 중립적, CTA 없음
 * - summary: 상태 요약, 숫자 강조, 행동 유도 없음
 * - hint: 안내/맥락 제공, 배경 연함, 버튼 없음
 * - action: 선택 유도, 버튼 1개만, OpportunitySection 전용
 */
export function Card({
  variant,
  icon,
  title,
  primaryText,
  subText,
  children,
  actionLabel,
  onAction,
  onClick,
  className = "",
  disabled = false,
}: CardProps) {
  // Variant별 스타일
  const variantStyles = {
    info: "bg-white border border-gray-200",
    summary: "bg-white border border-gray-200",
    hint: "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200",
    action: "bg-white border border-gray-200",
  };

  const iconColor = {
    info: "text-blue-600",
    summary: "text-green-600",
    hint: "text-blue-600",
    action: "text-blue-600",
  };

  // info variant에서 onClick이 있으면 클릭 가능하게
  const isClickable = variant === "info" && onClick && !onAction;

  return (
    <div
      className={`rounded-lg p-4 ${variantStyles[variant]} ${
        isClickable ? "cursor-pointer hover:border-blue-300 transition-colors" : ""
      } ${className}`}
      onClick={isClickable ? onClick : undefined}
    >
      {/* 헤더 (icon + title) */}
      {(icon || title) && (
        <div className="flex items-center gap-2 mb-3">
          {icon && <div className={iconColor[variant]}>{icon}</div>}
          {title && (
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          )}
        </div>
      )}

      {/* PrimaryText */}
      {primaryText && (
        <div className="mb-2">
          <p className="text-sm text-gray-700">{primaryText}</p>
        </div>
      )}

      {/* SubText */}
      {subText && (
        <div className="mb-3">
          <p className="text-xs text-gray-600">{subText}</p>
        </div>
      )}

      {/* Children (커스텀 콘텐츠) */}
      {children}

      {/* Action Button (action variant에서만) */}
      {variant === "action" && actionLabel && (
        <Button
          onClick={onAction}
          disabled={disabled || !onAction}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          size="sm"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
