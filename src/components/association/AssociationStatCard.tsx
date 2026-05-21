/**
 * AssociationStatCard Component
 * 협회 운영 지표 카드 (심플 버전)
 * 
 * 협회 홈 대시보드 상단에 배치되는 핵심 지표 카드
 */

import React from "react";

/**
 * Props
 */
export interface AssociationStatCardProps {
  /** 카드 제목 */
  title: string;
  /** 메인 값 */
  value: string | number;
  /** 보조 텍스트 */
  subtitle: string;
  /** 카드 색상 테마 */
  color: "blue" | "green" | "yellow" | "purple";
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 협회 운영 지표 카드
 * 
 * @example
 * ```tsx
 * <AssociationStatCard
 *   title="이번 달 대관 요청"
 *   value={42}
 *   subtitle="이번 달 전체 요청"
 *   color="blue"
 * />
 * ```
 */
export default function AssociationStatCard({
  title,
  value,
  subtitle,
  color,
  className = "",
}: AssociationStatCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      value: "text-blue-700 dark:text-blue-300",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      icon: "text-green-600 dark:text-green-400",
      value: "text-green-700 dark:text-green-300",
    },
    yellow: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: "text-yellow-600 dark:text-yellow-400",
      value: "text-yellow-700 dark:text-yellow-300",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-800",
      icon: "text-purple-600 dark:text-purple-400",
      value: "text-purple-700 dark:text-purple-300",
    },
  };

  const theme = colorClasses[color];

  // 값 포맷팅 (숫자면 천단위 콤마)
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div
      className={`rounded-xl border-2 p-5 h-[140px] flex flex-col justify-between ${theme.bg} ${theme.border} ${className}`}
    >
      {/* 제목 */}
      <div className={`text-sm font-medium ${theme.icon}`}>{title}</div>

      {/* 메인 값 */}
      <div
        className={`text-[40px] font-bold leading-none ${theme.value}`}
      >
        {formattedValue}
      </div>

      {/* 보조 텍스트 */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {subtitle}
      </div>
    </div>
  );
}

