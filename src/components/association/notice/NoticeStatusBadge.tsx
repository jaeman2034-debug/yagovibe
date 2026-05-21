/**
 * 공지 상태 뱃지 컴포넌트
 * 
 * 원칙:
 * - 상태별 색상 구분
 * - 재사용 가능한 일관된 스타일
 */

import type { NoticeStatus } from "@/types/notice";

interface NoticeStatusBadgeProps {
  status: NoticeStatus;
  size?: "sm" | "md" | "lg";
}

export function NoticeStatusBadge({ status, size = "md" }: NoticeStatusBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const statusConfig: Record<NoticeStatus, { label: string; color: string; icon?: string }> = {
    draft: { label: "임시 저장", color: "bg-gray-100 text-gray-700 border-gray-300", icon: "⚫" },
    pending: { label: "승인 대기", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: "🟡" },
    published: { label: "게시중", color: "bg-green-100 text-green-700 border-green-300", icon: "🟢" },
    scheduled: { label: "예약 게시", color: "bg-blue-100 text-blue-700 border-blue-300", icon: "🔵" },
    expired: { label: "만료됨", color: "bg-gray-100 text-gray-500 border-gray-300", icon: "⚪" },
    rejected: { label: "반려됨", color: "bg-red-100 text-red-700 border-red-300", icon: "🔴" },
    archived: { label: "보관됨", color: "bg-gray-100 text-gray-500 border-gray-300", icon: "📦" },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1 rounded border font-medium ${sizeClasses[size]} ${config.color}`}>
      {config.icon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}

