/**
 * 🔥 Stat Card 컴포넌트
 * 
 * 역할:
 * - 통계 카드 UI
 * - 숫자 + 라벨 + 아이콘
 */

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
}

export function StatCard({
  label,
  value,
  icon,
  subtitle,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: "bg-white",
    primary: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    danger: "bg-red-50 border-red-200",
  };

  const iconStyles = {
    default: "text-gray-400",
    primary: "text-blue-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  // 숫자 포맷팅 (천단위 콤마)
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card className={`${variantStyles[variant]} h-full`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {icon && (
            <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${iconStyles[variant]}`}>
              <div className="w-4 h-4 sm:w-5 sm:h-5">{icon}</div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-0.5 sm:mb-1 truncate">
              {label}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              {formattedValue}
            </div>
            {subtitle && (
              <div className="text-xs text-gray-500 mt-0.5 sm:mt-1 line-clamp-1">
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
