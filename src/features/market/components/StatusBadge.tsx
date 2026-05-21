/**
 * 🔥 거래 상태 배지 컴포넌트
 * 도메인 규칙: 상태 표시 표준화
 */

import type { MarketPost } from "../types";

interface StatusBadgeProps {
  status: MarketPost["status"];
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; bgColor: string; textColor: string }> = {
  active: {
    label: "판매중",
    emoji: "🟢",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  open: {
    label: "판매중",
    emoji: "🟢",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  reserved: {
    label: "예약중",
    emoji: "🔒",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
  },
  completed: {
    label: "거래완료",
    emoji: "✅",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  done: {
    label: "거래완료",
    emoji: "✅",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  hidden: {
    label: "숨김",
    emoji: "👁️‍🗨️",
    bgColor: "bg-gray-200",
    textColor: "text-gray-600",
  },
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.emoji} {config.label}
    </span>
  );
}
